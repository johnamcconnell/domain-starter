import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import contractABI from './utils/contractABI.json';
import { ethers } from 'ethers';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

// Constants
const TWITTER_HANDLE = 'cheif_mcconnell';
const TWITTER_HANDLE_BS = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TWITTER_LINK_BS = `https://twitter.com/${TWITTER_HANDLE_BS}`;

// const MOON = "https://s3-us-west-2.amazonaws.com/s.cdpn.io/1231630/moon2.png";

const tld = '.blockhead';
const CONTRACT_ADDRESS = '0x8B9C46b20f2f4dbE3399713730CbAc0ED0534BAc';

const App = () => {
	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');
	const [network, setNetwork] = useState('');
	const [editing, setEditing] = useState(false);
	const [mints, setMints] = useState([]);
	const [loading, setLoading] = useState(false);

	const connectWallet = async () => {
		try {
			const { ethereum } = window;

			if (!ethereum) {
				alert("Get MetaMask -> https://metamask.io/");
				return;
			}

			// Fancy method to request access to account.
			const accounts = await ethereum.request({ method: "eth_requestAccounts" });
		
			// Boom! This should print out public address once we authorize Metamask.
			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);
		} catch (error) {
			console.log(error)
		}
	}

	const switchNetwork = async () => {
		if (window.ethereum) {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881' }],
				});
			} catch (error) {
				if (error.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: '0x13881',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
									nativeCurrency: {
										name: "Mumbai Matic",
										symbol: "MATIC",
										decimals: 18
									},
									blockExplorerUrls: ['https://mumbai.polygonscan.com/']
								},
							],
						});
					} catch (error) {
						console.log(error);
					}
				}
				console.log(error);
			}
		} else {
			alert('Metamask not installed. please install by going here: https://metamask.io/download.html')
		}
	}
  // Gotta make sure this is async.
	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;

		if (!ethereum) {
			console.log('Make sure you have metamask!');
			return;
		} else {
			console.log('We have the ethereum object', ethereum);
		}

		const accounts = await ethereum.request({ method: 'eth_accounts' });

		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log('Found an authorized account:', account);
			setCurrentAccount(account);
		} else {
			console.log('No authorized account found');
		}

		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);

		ethereum.on('chainChanged', handleChainChanged);

		function handleChainChanged(_chainId) {
			window.location.reload();
		}
  }
  
  const mintDomain = async () => {
	// Don't run if the domain is empty
	if (!domain) { return }
	// Alert the user if the domain is too short
	if (domain.length < 3) {
		alert('Domain must be at least 3 characters long');
		return;
	}
	// Calculate price based on length of domain (change this to match your contract)	
	// 3 chars = 0.5 MATIC, 4 chars = 0.3 MATIC, 5 or more = 0.1 MATIC
	const price = domain.length === 3 ? '0.005' : domain.length === 4 ? '0.003' : '0.001';
	console.log("Minting domain", domain, "with price", price);
  try {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

			console.log("Going to pop wallet now to pay gas...")
      let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
      // Wait for the transaction to be mined
			const receipt = await tx.wait();

			// Check if the transaction was successfully completed
			if (receipt.status === 1) {
				console.log("Domain minted! https://mumbai.polygonscan.com/tx/" + tx.hash);
				alert(<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${domain.id}`} target="_blank" rel="noopener noreferrer">
										<p className="underlined">congrats! {' '}{domain.name}{tld}{' '} was minted!</p>
									</a>)
				
				// Set the record for the domain
				tx = await contract.setRecord(domain, record);
				await tx.wait();

				console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);
				
				setTimeout(() => {
					fetchMints();
				}, 2000);
				setRecord('');
				setDomain('');
			} else {
				alert("Transaction failed! Please try again");
			}
    }
  }
  catch(error){
    console.log(error);
  }
}
	const fetchMints = async () => {
	try {
		const { ethereum } = window;
		if (ethereum) {
			// You know all this
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);
				
			// Get all the domain names from our contract
			const names = await contract.getAllNames();
				
			// For each name, get the record and the address
			const mintRecords = await Promise.all(names.map(async (name) => {
			const mintRecord = await contract.records(name);
			const owner = await contract.domains(name);
			return {
				id: names.indexOf(name),
				name: name,
				record: mintRecord,
				owner: owner,
			};
		}));

		console.log("MINTS FETCHED ", mintRecords);
		setMints(mintRecords);
		}
	} catch(error){
		console.log(error);
	}
	}
	
	  useEffect(() => {
	if (network === 'Polygon Mumbai Testnet') {
		fetchMints();
	}
}, [currentAccount, network]);
	
	const updateDomain = async () => {
	if (!record || !domain) { return }
	setLoading(true);
	console.log("Updating domain", domain, "with record", record);
  	try {
		const { ethereum } = window;
		if (ethereum) {
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

			let tx = await contract.setRecord(domain, record);
			await tx.wait();
			console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);

			fetchMints();
			setRecord('');
			setDomain('');
		}
  	} catch(error) {
    	console.log(error);
  	}
	setLoading(false);
}


  // Create a function to render if wallet is not connected yet
  const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media.giphy.com/media/3ohhwytHcusSCXXOUg/giphy.gif" alt="Ninja donut gif" />
			{/* Call the connectWallet function we just wrote when the button is clicked */}
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
	);
  
	const renderInputForm = () => {
	
		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
					<h2>Please switch to Polygon Mumbai Testnet</h2>
					{/* This button will call our switch network function */}
					<button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
				</div>
			);
		}
		
		return (
			<div className="form-container">
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder='your_domain'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder='what kind of blockhead are you?'
					onChange={e => setRecord(e.target.value)}
				/>

					{editing ? (
				<div className="button-container">
					<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
						Set record
					</button>  
					<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
						Cancel
					</button>  
				</div>
				) :
					(
					<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
						Mint
					</button>  
					)
				}
			</div>
		);
} 
  
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

const renderMints = () => {
	if (currentAccount && mints.length > 0) {
		return (
			<div className="mint-container">
				<p className="subtitle"> Recently minted domains!</p>
				<div className="mint-list">
					{ mints.map((mint, index) => {
						return (
							<div className="mint-item" key={index}>
								<div className='mint-row'>
									<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
										<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
									</a>
									{/* If mint.owner is currentAccount, add an "edit" button*/}
									{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
										<button className="edit-button" onClick={() => editRecord(mint.name)}>
											<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
										</button>
										:
										null
									}
								</div>
					<p> {mint.record} </p>
				</div>)
				})}
			</div>
		</div>);
	}
};

const editRecord = (name) => {
	console.log("Editing record for", name);
	setEditing(true);
	setDomain(name);
}

  return (
	  <div className='App'>
		  
		  <div className='container'>
			<div className='background-container'>
			{/* <img alt="moon" className="imgStars" src={MOON} /> */}
			<div className="stars"></div>
			<div className="twinkling"></div>
			  <div className="clouds"></div>
			  </div>
        <div className='header-container'>
          <header>
            <div className='left'>
              <p className='title'>Blockhead Name Service </p>
              <p className='subtitle'>BNS on the blockchain! 👾</p>
			</div>
			<div className="right">
				<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
				{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
			</div>
          </header>
        </div>

        {!currentAccount && renderNotConnectedContainer()}
		{currentAccount && renderInputForm()}
		{mints && renderMints()}

        <div className='footer-container'>
          <img alt='Twitter Logo' className='twitter-logo' src={twitterLogo} />
          <p>built with 💜 ✖️ 🦄 ✖️ 🌈 ✖️ 🥑 on <a href={TWITTER_LINK_BS}>@{TWITTER_HANDLE_BS}</a></p>
          {/* <hr/> */}
          <a
            className='footer-text'
            href={TWITTER_LINK}
            target='_blank'
            rel='noreferrer'
          >
          By: {`@${TWITTER_HANDLE}`} 
          </a>
        </div>
		  </div>

    </div>
  );
};

export default App;
