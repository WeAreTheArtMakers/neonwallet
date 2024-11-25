"use strict";

// Minimum STREET Bakiye Gereksinimi
const MINIMUM_STREET_BALANCE = 50000000;

// Web3Modal ve sağlayıcılar
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
let web3;
let userAddress;
let web3Modal;
let provider;

// Token Adres Eşlemesi (Adresleri küçük harfli ve checksummed formatta kullanacağız)
const tokenAddresses = {
    WBNB: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // Wrapped BNB (küçük harfli)
    WMATIC: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", // Wrapped MATIC (küçük harfli)
    STREET_BNB: "0x7599419a804c792239098917e5bb5b75c9071cf3", // STREET Token BNB Chain adresi (küçük harfli)
    STREET_MATIC: "0x9945c9f5db4e6f2fc5b7c0d74de604483829040f", // STREET Token Polygon adresi (küçük harfli)
};

// STREET Token Bilgisi
const tokens = {
    STREET: {
        name: "STREET MONEY",
        addresses: {
            56: tokenAddresses.STREET_BNB, // BNB Chain
            137: tokenAddresses.STREET_MATIC, // Polygon
        },
        decimals: 18,
    },
};

// Token adresini zincir ve sembole göre döndüren fonksiyon
function getTokenAddress(chainId, tokenSymbol) {
    if (chainId === 56) { // BNB Chain
        if (tokenSymbol === 'BNB') {
            return web3.utils.toChecksumAddress(tokenAddresses.WBNB);
        } else if (tokenSymbol === 'STREET') {
            return web3.utils.toChecksumAddress(tokenAddresses.STREET_BNB);
        } else {
            return null;
        }
    } else if (chainId === 137) { // Polygon
        if (tokenSymbol === 'MATIC') {
            return web3.utils.toChecksumAddress(tokenAddresses.WMATIC);
        } else if (tokenSymbol === 'STREET') {
            return web3.utils.toChecksumAddress(tokenAddresses.STREET_MATIC);
        } else {
            return null;
        }
    } else {
        return null;
    }
}

// Web3Modal Başlatma
function initWeb3Modal() {
    const providerOptions = {
        walletconnect: {
            package: WalletConnectProvider,
            options: {
                rpc: {
                    56: "https://bsc-dataseed.binance.org/", // BNB Chain
                    137: "https://polygon-rpc.com/", // Polygon
                },
            },
        },
    };

    web3Modal = new Web3Modal({
        network: "mainnet",
        cacheProvider: false,
        providerOptions,
        theme: "dark",
    });
}

// Kullanıcının STREET Bakiyesini Kontrol Etme ve UI Güncelleme
async function checkStreetBalanceAndUpdateUI(chainId) {
    try {
        // Doğru token adresini al
        const tokenAddress = tokens.STREET.addresses[chainId];

        if (!tokenAddress) {
            throw new Error("Desteklenmeyen ağ.");
        }

        const contract = new web3.eth.Contract(
            [
                {
                    inputs: [{ internalType: "address", name: "owner", type: "address" }],
                    name: "balanceOf",
                    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                    stateMutability: "view",
                    type: "function",
                },
            ],
            web3.utils.toChecksumAddress(tokenAddress)
        );

        const rawBalance = await contract.methods.balanceOf(userAddress).call();
        const balance = rawBalance / 10 ** tokens.STREET.decimals;

        document.querySelector("#tokenTable tbody").innerHTML = `
            <tr>
                <td class="token-icon">
                    <img src="https://modfxmarket.com/street/img/street12.PNG" alt="Token Icon"> STREET MONEY
                </td>
                <td>${balance.toFixed(4)}</td>
            </tr>
        `;

        const downloadSection = document.getElementById("downloadSection");
        if (balance >= MINIMUM_STREET_BALANCE) {
            downloadSection.innerHTML = `
                <h3>Uygulamayı İndirin</h3>
                <p>Windows ve Mac versiyonlarını buradan indirebilirsiniz:</p>
                <a href="https://modfxmarket.com/neonwallet/apps/modX-win.zip" class="modX">Windows Versiyon</a>
                <a href="https://modfxmarket.com/neonwallet/apps/modX-mac.zip" class="modX">Mac Versiyon</a>
            `;
            toastr.success("50 milyon STREET bakiyeniz var, modX'e erişebilirsiniz!");
        } else {
            downloadSection.innerHTML = `
                <h3>modX analizine erişiminiz yok</h3>
                <p>İndirilebilir içeriklere erişmek için 50 milyon STREET MONEY olmalıdır.</p>
            `;
            toastr.error("STREET bakiyeniz yetersiz.");
        }
    } catch (error) {
        console.error("STREET bakiyesi kontrol edilirken hata:", error);
        toastr.error("STREET bakiyesi kontrolü sırasında bir hata oluştu.");
    }
}

// Kullanıcının Bağlı Olduğu Ağı Belirleme
async function determineNetwork() {
    const chainId = await web3.eth.getChainId();
    let networkName, logoUrl;

    if (chainId === 56) {
        networkName = "BNB Chain";
        logoUrl = "https://cryptologos.cc/logos/binance-coin-bnb-logo.png";
    } else if (chainId === 137) {
        networkName = "Polygon Network";
        logoUrl = "https://cryptologos.cc/logos/polygon-matic-logo.png";
    } else {
        throw new Error("Desteklenmeyen ağ. Lütfen BNB Chain veya Polygon ağına bağlanın.");
    }

    document.getElementById("connect").innerHTML += ` 
            <br><img src="${logoUrl}" alt="${networkName} Logo" style="width: 20px; height: 20px; vertical-align: middle; margin-left: 5px;">
            Şu anda ${networkName} ağına bağlısınız.
        `;
    return chainId;
}

// Router adresleri
const routerAddresses = {
    56: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap Router (BNB Chain)
    137: "0xa5E0829CaCED8FfDD4De3c43696c57F7D7A678ff", // QuickSwap Router (Polygon)
};

// Swap fonksiyonu
document.querySelector("#swapForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const fromToken = document.querySelector("#fromToken").value;
        const toToken = document.querySelector("#toToken").value;
        const amount = document.querySelector("#amount").value;

        // Miktar doğrulaması
        if (!amount || amount <= 0) {
            toastr.error("Geçerli bir miktar giriniz.");
            return;
        }

        // Aynı token'lar arasında takas yapılamaz
        if (fromToken === toToken) {
            toastr.error("Aynı tokenlar arasında takas yapılamaz.");
            return;
        }

        const chainId = await web3.eth.getChainId();

        // Token adreslerini al ve checksum formatına dönüştür
        let fromTokenAddress = getTokenAddress(chainId, fromToken);
        let toTokenAddress = getTokenAddress(chainId, toToken);

        if (!fromTokenAddress || !toTokenAddress) {
            toastr.error("Geçersiz token seçimi.");
            return;
        }

        // Router adresini al ve checksum formatına dönüştür
        const routerAddress = web3.utils.toChecksumAddress(routerAddresses[chainId]);

        if (!routerAddress) {
            toastr.error("Desteklenmeyen ağ.");
            return;
        }

        // Router sözleşmesini başlat
        const routerAbi = [
            // swapExactTokensForTokens
            {
                "inputs": [
                    { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
                    { "internalType": "address[]", "name": "path", "type": "address[]" },
                    { "internalType": "address", "name": "to", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                ],
                "name": "swapExactTokensForTokens",
                "outputs": [
                    { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            // swapExactETHForTokens
            {
                "inputs": [
                    { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
                    { "internalType": "address[]", "name": "path", "type": "address[]" },
                    { "internalType": "address", "name": "to", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                ],
                "name": "swapExactETHForTokens",
                "outputs": [
                    { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
                ],
                "stateMutability": "payable",
                "type": "function"
            },
            // swapExactTokensForETH
            {
                "inputs": [
                    { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
                    { "internalType": "address[]", "name": "path", "type": "address[]" },
                    { "internalType": "address", "name": "to", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                ],
                "name": "swapExactTokensForETH",
                "outputs": [
                    { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
            },
        ];
        const routerContract = new web3.eth.Contract(routerAbi, routerAddress);

        // Miktarı Wei'ye çevir
        const amountInWei = web3.utils.toWei(amount, "ether");

        // Deadline belirle
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 dakika

        let path;
        let swapMethod;
        let value = 0;

        // Yerel token sembolünü belirle
        const nativeTokenSymbol = (chainId === 56) ? 'BNB' : (chainId === 137) ? 'MATIC' : null;

        if (!nativeTokenSymbol) {
            toastr.error("Desteklenmeyen ağ.");
            return;
        }

        // Wrapped native token adresini al
        const wrappedNativeTokenAddress = getTokenAddress(chainId, nativeTokenSymbol);

        // Takas yönüne göre işlem yap
        if (fromToken === nativeTokenSymbol) {
            // Yerel token'dan ERC20 token'a takas
            swapMethod = routerContract.methods.swapExactETHForTokens;
            path = [wrappedNativeTokenAddress, toTokenAddress];
            value = amountInWei;

            // İşlemi gerçekleştir
            await swapMethod(
                0, // amountOutMin (slippage hesaplaması yapabilirsiniz)
                path,
                userAddress,
                deadline
            ).send({ from: userAddress, value: value });

        } else if (toToken === nativeTokenSymbol) {
            // ERC20 token'dan yerel token'a takas
            swapMethod = routerContract.methods.swapExactTokensForETH;
            path = [fromTokenAddress, wrappedNativeTokenAddress];

            // Onaylama işlemi
            const fromTokenContract = new web3.eth.Contract([
                {
                    "constant": false,
                    "inputs": [
                        { "name": "_spender", "type": "address" },
                        { "name": "_value", "type": "uint256" }
                    ],
                    "name": "approve",
                    "outputs": [{ "name": "", "type": "bool" }],
                    "type": "function"
                }
            ], fromTokenAddress);

            await fromTokenContract.methods.approve(routerAddress, amountInWei).send({ from: userAddress });

            // İşlemi gerçekleştir
            await swapMethod(
                amountInWei,
                0, // amountOutMin
                path,
                userAddress,
                deadline
            ).send({ from: userAddress });

        } else {
            // İki ERC20 token arasında takas
            swapMethod = routerContract.methods.swapExactTokensForTokens;
            path = [fromTokenAddress, toTokenAddress];

            // Onaylama işlemi
            const fromTokenContract = new web3.eth.Contract([
                {
                    "constant": false,
                    "inputs": [
                        { "name": "_spender", "type": "address" },
                        { "name": "_value", "type": "uint256" }
                    ],
                    "name": "approve",
                    "outputs": [{ "name": "", "type": "bool" }],
                    "type": "function"
                }
            ], fromTokenAddress);

            await fromTokenContract.methods.approve(routerAddress, amountInWei).send({ from: userAddress });

            // İşlemi gerçekleştir
            await swapMethod(
                amountInWei,
                0, // amountOutMin
                path,
                userAddress,
                deadline
            ).send({ from: userAddress });
        }

        // Başarılı işlem bildirimi
        toastr.success("Takas işlemi başarıyla gerçekleştirildi!");

    } catch (error) {
        console.error("Takas işlemi sırasında hata:", error);
        toastr.error("Takas işlemi başarısız.");
    }
});

// Cüzdan Bağlantısı
async function connectWallet() {
    try {
        provider = await web3Modal.connect();
        web3 = new Web3(provider);

        const accounts = await web3.eth.getAccounts();
        userAddress = accounts[0];
        console.log("Cüzdan bağlandı:", userAddress);

        const chainId = await determineNetwork();
        await checkStreetBalanceAndUpdateUI(chainId);
    } catch (error) {
        if (error.message === "Modal closed by user") {
            console.warn("Kullanıcı modalı kapattı.");
        } else {
            console.error("Cüzdan bağlantısı sırasında hata:", error);
            toastr.error("Cüzdan bağlantısı başarısız.");
        }
    }
}

// Sayfa Yüklendiğinde İşlemleri Başlat
window.addEventListener("load", () => {
    initWeb3Modal();

    const connectButton = document.getElementById("connectWallet");
    if (connectButton) {
        connectButton.addEventListener("click", connectWallet);
    }
});
