// Account selector utility to switch between MetaMask accounts
async function addAccountSelector(labelText = 'Account:', containerSelector = '.account-container', refreshOnChange = true) {
    try {
        // Make sure MetaMask is available
        if (!window.ethereum) {
            console.error('MetaMask is not available');
            return;
        }
        
        // Get all accounts
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (!accounts || accounts.length === 0) {
            console.error('No accounts found in MetaMask');
            return;
        }
        
        // Find or create the account selector container
        let selectorContainer = document.getElementById('account-selector-container');
        if (!selectorContainer) {
            // Create the container if it doesn't exist
            selectorContainer = document.createElement('div');
            selectorContainer.id = 'account-selector-container';
            selectorContainer.className = 'account-selector';
            
            // Insert at specified container
            const parentContainer = document.querySelector(containerSelector);
            if (parentContainer) {
                parentContainer.appendChild(selectorContainer);
            } else {
                // Fallback - add to body
                document.body.appendChild(selectorContainer);
            }
        }
        
        // Clear existing content
        selectorContainer.innerHTML = '';
        
        // Add a label
        const label = document.createElement('div');
        label.textContent = labelText;
        label.className = 'account-label';
        selectorContainer.appendChild(label);
        
        // Create the selector
        const selector = document.createElement('select');
        selector.id = 'account-selector';
        selector.className = 'account-dropdown';
        
        // Add options for each account
        accounts.forEach((account, index) => {
            const option = document.createElement('option');
            option.value = account;
            option.textContent = `${account.substring(0, 8)}...${account.substring(account.length - 6)}`;
            
            // Select the current account
            if (account === window.ethereum.selectedAddress) {
                option.selected = true;
            }
            
            selector.appendChild(option);
        });
        
        // Add change event
        selector.addEventListener('change', async function() {
            const selectedAccount = this.value;
            console.log('Switching to account:', selectedAccount);
            
            try {
                // Request account switch
                const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
                
                // Force MetaMask to show the account selection screen
                await window.ethereum.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: {} }]
                });
                
                // Request the specific account
                await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                
                // Update UI with account info
                if (refreshOnChange) {
                    // Force refresh after short delay to ensure account change takes effect
                    setTimeout(() => {
                        location.reload();
                    }, 500);
                }
            } catch (error) {
                console.error('Error switching account:', error);
                alert('Could not switch account. Please try manually switching in MetaMask.');
            }
        });
        
        selectorContainer.appendChild(selector);
        
        // Add some CSS for the account selector
        addAccountSelectorStyles();
        
        return selectorContainer;
    } catch (error) {
        console.error('Error setting up account selector:', error);
        return null;
    }
}

// Add styles for the account selector
function addAccountSelectorStyles() {
    // Check if styles already exist
    if (document.getElementById('account-selector-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'account-selector-styles';
    style.textContent = `
        .account-selector {
            margin: 10px 0;
            padding: 8px;
            background-color: #f5f5f5;
            border-radius: 4px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .account-label {
            margin-right: 10px;
            font-weight: bold;
            color: #333;
        }
        .account-dropdown {
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #ddd;
            background-color: white;
            flex-grow: 1;
            font-size: 14px;
            cursor: pointer;
        }
        .account-dropdown:hover {
            border-color: #aaa;
        }
        .account-dropdown:focus {
            outline: none;
            border-color: #4285f4;
            box-shadow: 0 0 0 2px rgba(66,133,244,0.3);
        }
    `;
    document.head.appendChild(style);
}

// Export functions
window.addAccountSelector = addAccountSelector;
window.addAccountSelectorStyles = addAccountSelectorStyles; 