const restapi_token = 'http://139.196.243.115:18080/oauth-server/oc/v3/oauth2/authorize';

var app = angular.module('neow', ['pascalprecht.translate']);

app.config( ['$compileProvider', function( $compileProvider ) {
	 $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|blob|ftp|mailto|tel|file|sms):/);
}]);

app.config(['$translateProvider',function($translateProvider){
    //var lang = window.localStorage.lang||'zh-hans';
    $translateProvider.useStaticFilesLoader({
        prefix: 'i18n/',
        suffix: '.json'
    });

    $translateProvider.preferredLanguage('zh-hans');
}]);

app.directive('onReadFile', function ($parse) {
	return {
		restrict: 'A',
		scope: false,
		link: function(scope, element, attrs) {
            var fn = $parse(attrs.onReadFile);
            
			element.on('change', function(onChangeEvent) {
				var file = (onChangeEvent.srcElement || onChangeEvent.target).files[0];
				var reader = new FileReader();
                
				reader.onload = function(onLoadEvent) {
					var Uints = new Uint8Array(reader.result);
					var db = new window.SQL.Database(Uints);
					
					var res = db.exec("SELECT * FROM Key");
					var passwordHash = new ArrayBuffer();
					var iv = new ArrayBuffer();
					var masterKey = new ArrayBuffer();
					for(i=0;i<res[0].values.length;i++) {
						if ( res[0].values[i][0] == 'PasswordHash' ) {
							passwordHash = res[0].values[i][1];
						} else if ( res[0].values[i][0] == 'IV' ) {
							iv = res[0].values[i][1];
						} else if ( res[0].values[i][0] == 'MasterKey' ) {
							masterKey = res[0].values[i][1];
						}
					}
					
					res = db.exec("SELECT * FROM Account");
					var publicKeyHash = new Array()
					var privateKeyEncrypted = new Array()
					for(i=0;i<res[0].values.length;i++) {
						for(j=0;j<res[0].values[i].length;j++){
							if ( j == 0 ) {
								publicKeyHash[i] = res[0].values[i][j];
							}
							if ( j == 1 ) {
								privateKeyEncrypted[i] = res[0].values[i][j];
							}
						}
					}
					
					var wallet = new Wallet(passwordHash,iv,masterKey,publicKeyHash,privateKeyEncrypted);
					
					scope.$apply(function() {
						fn(scope, {$wallet:wallet});
					});
					
				};

				reader.readAsArrayBuffer(file);
			});
		}
	};
});

app.controller("SignatureDataCtrl", function($scope,$sce) {
	$scope.txRawData = "";
	$scope.privateKey = "";
	$scope.signedData = "";

	$scope.notifier = Notifier;
	$scope.notifier.sce = $sce;
    $scope.notifier.scope = $scope;

	$scope.signatureData = function() {
		if ( $scope.privateKey.length != 64 ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_PRIVATEKEY_LENGTH_CHECK_FAILED') );
		} else {
			$scope.signedData = Wallet.signatureData( $scope.txRawData, $scope.privateKey );
		}
	}
});
/*
app.controller("hashCalcCtrl", function($scope,$sce) {
	$scope.hashRawData = "";
	$scope.hashedData = "";

	$scope.hashAlgo  = "sha256";
	$scope.hashAlgos = [
		{name:'sha256',algo:'sha256'},
		{name:'sm3',algo:'sm3'},
		{name:'md5',algo:'md5'},
    ];

	$scope.notifier = Notifier;
	$scope.notifier.sce = $sce;
    $scope.notifier.scope = $scope;

	$scope.hashCalc = function() {
		if ( $scope.hashAlgo == 'sha256' ) {
			$scope.hashedData = Wallet.Sha256($scope.hashRawData);
		} else if ( $scope.hashAlgo == 'sm3' ) {
			$scope.hashedData = Wallet.SM3($scope.hashRawData);
		} else if ( $scope.hashAlgo == 'md5' ) {
			$scope.hashedData = Wallet.MD5($scope.hashRawData);
		}
	}
});
*/
app.controller("ToolsCtrl", function($scope,$sce) {
	$scope.wif = "";
	$scope.privateKey = "";
	$scope.publicKey = "";
	$scope.publicKeyEncode = "";
	$scope.script = "";
	$scope.scriptHash = "";
	$scope.address = "";

	$scope.notifier = Notifier;
	$scope.notifier.sce = $sce;
    $scope.notifier.scope = $scope;

    $scope.getPrivateKey = function() {
    	if ( $scope.wif.length != 52 ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_WIF_LENGTH_CHECK_FAILED') );
		} else {
    		var ret = Wallet.getPrivateKeyFromWIF($scope.wif);
    		if ( ret == -1 || ret == -2 ) {
    			$scope.notifier.danger($translate.instant('NOTIFIER_WIF_DECRYPT_FAILED') );
    		} else {
    			$scope.privateKey = ret;
    		}
    	}
    }

	$scope.getPublicKey = function($encode) {
		if ( $scope.privateKey.length != 64 ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_PRIVATEKEY_LENGTH_CHECK_FAILED') );
		} else {
			$scope.publicKey = Wallet.getPublicKey( $scope.privateKey, $encode ).toString("hex");
		}
	}

	$scope.getPublicKeyEncoded = function() {
		if ( $scope.publicKey.length != 130 ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_PUBLICKEY_LENGTH_CHECK_FAILED') );
		} else {
			$scope.publicKeyEncode = Wallet.getPublicKeyEncoded( $scope.publicKey ).toString("hex");
		}
	}

	$scope.getScript = function() {
		if ( $scope.publicKeyEncode.length != 66 ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_PUBLICKEY_ENCODED_LENGTH_CHECK_FAILED') );
		} else {
			$scope.script = "21" + $scope.publicKeyEncode + "ac";
		}
	}

	$scope.getScriptHash = function() {
		if ( $scope.script.length != 70 ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_SCRIPT_LENGTH_CHECK_FAILED') );
		} else {
			$scope.scriptHash = Wallet.getHash( $scope.script ).toString();
		}
	}

	$scope.getAddress = function() {
		if ( $scope.scriptHash.length != 40 ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_SCRIPTHASH_LENGTH_CHECK_FAILED') );
		} else {
			$scope.address = Wallet.ToAddress( hexstring2ab($scope.scriptHash) );
		}
	}
});

app.controller("GenerateWalletCtrl", function($scope,$translate,$sce) {
	$scope.privateKey = $scope.WIFKey = "";
	$scope.createPassword1 = $scope.createPassword2 = "";
	$scope.createType = "fromRandomPrivateKey";
	$scope.objectURL = $scope.objectName = "";

	$scope.styleStringOfCreatePassword1 = $scope.styleStringOfCreatePassword2 = "";
	$scope.isDisplayPassword = false;
	$scope.fileDownloaded = false;

	$scope.showCreateWallet = true;
	$scope.showCreateWalletDownload = false;
	$scope.showBtnGenerateWallet = false;

	$scope.notifier = Notifier;
	$scope.notifier.sce = $sce;
    $scope.notifier.scope = $scope;

	$scope.changeCreatePassword1 = function() {
		if ( $scope.createPassword1.length >= 8 ) {
			$scope.styleStringOfCreatePassword1 = "has-success";
		} else {
			$scope.styleStringOfCreatePassword1 = "has-warning";
		}

		if ( $scope.isDisplayPassword ) {
			if ( $scope.createPassword1.length >= 8 ) {
				$scope.showBtnGenerateWallet = true;
			} else if ( $scope.createPassword1.length < 8 ) {
				$scope.showBtnGenerateWallet = false;
			}
		} else {
			$scope.changeCreatePassword2();
		}
	};

	$scope.changeCreatePassword2 = function() {
		if ( $scope.createPassword2.length >= 8 && $scope.createPassword1 == $scope.createPassword2 ) {
			$scope.styleStringOfCreatePassword2 = "has-success";
			$scope.showBtnGenerateWallet = true;
		} else {
			$scope.styleStringOfCreatePassword2 = "has-warning";
			$scope.showBtnGenerateWallet = false;
		}
	};

	$scope.changeDisplayPassword = function() {
		$scope.isDisplayPassword = !$scope.isDisplayPassword;

		if ( $scope.isDisplayPassword ) {
			if ( $scope.createPassword1.length >= 8 ) {
				$scope.showBtnGenerateWallet = true;
			} else if ( $scope.createPassword1.length < 8 ) {
				$scope.showBtnGenerateWallet = false;
			}
		} else {
			if ( $scope.createPassword2 >= 8 && $scope.createPassword1 == $scope.createPassword2 ) {
				$scope.showBtnGenerateWallet = true;
			} else {
				$scope.showBtnGenerateWallet = false;
			}
		}
	};

	$scope.downloaded = function () {
        $scope.fileDownloaded = true;
    };

    $scope.nextstep = function () {
        $('#mainTab a[href="#makeTransaction"]').tab('show');
    };

	$scope.generateWalletFileFromRandomPrivateKey = function () {
		if ( $scope.createPassword1.length < 8 ) return;
		if ( !$scope.isDisplayPassword ) {
			if ( $scope.createPassword2.length < 8 ) return;
			if ( $scope.createPassword1 != $scope.createPassword2 ) return;
		}

		$scope.showCreateWallet = false;
		$scope.showCreateWalletDownload = true;

		$scope.privateKey = ab2hexstring( Wallet.generatePrivateKey() );

		var walletBlob = Wallet.generateWalletFileBlob( $scope.privateKey, $scope.createPassword1 );
		$scope.objectURL =  window.URL.createObjectURL( new Blob([walletBlob], {type: 'application/octet-stream'}) );
		$scope.objectName = $scope.objectURL.substring( $scope.objectURL.lastIndexOf( '/' ) + 1 );
		//$scope.objectName = $scope.objectName.replace( /-/g, "" );

		$scope.notifier.success($translate.instant('NOTIFIER_SUCCESS_GENERATE_THE_WALLET') + " <b>wallet--" + $scope.objectName + ".db3</b>" );
	};

	$scope.generateWalletFileFromPrivateKey = function () {
		if ( $scope.createPassword1.length < 8 ) return;
		if ( !$scope.isDisplayPassword ) {
			if ( $scope.createPassword2.length < 8 ) return;
			if ( $scope.createPassword1 != $scope.createPassword2 ) return;
		}

		if ( $scope.privateKey.length != 64 ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_PRIVATEKEY_LENGTH_CHECK_FAILED'));
			return;
		}

		$scope.showCreateWallet = false;
		$scope.showCreateWalletDownload = true;

		var walletBlob = Wallet.generateWalletFileBlob( $scope.privateKey, $scope.createPassword1 );
		$scope.objectURL =  window.URL.createObjectURL( new Blob([walletBlob], {type: 'application/octet-stream'}) );
		$scope.objectName = $scope.objectURL.substring( $scope.objectURL.lastIndexOf( '/' ) + 1 );

		$scope.notifier.success($translate.instant('NOTIFIER_SUCCESS_GENERATE_THE_WALLET') + " <b>wallet--" + $scope.objectName + ".db3</b>" );
	};

	$scope.generateWalletFileFromWIFKey = function () {
		if ( $scope.createPassword1.length < 8 ) return;
		if ( !$scope.isDisplayPassword ) {
			if ( $scope.createPassword2.length < 8 ) return;
			if ( $scope.createPassword1 != $scope.createPassword2 ) return;
		}

		if ( $scope.WIFKey.length != 52 ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_WIF_LENGTH_CHECK_FAILED'));
			return;
		}

		$scope.showCreateWallet = false;
		$scope.showCreateWalletDownload = true;

		$scope.privateKey = Wallet.getPrivateKeyFromWIF( $scope.WIFKey );

		var walletBlob = Wallet.generateWalletFileBlob( $scope.privateKey, $scope.createPassword1 );
		$scope.objectURL =  window.URL.createObjectURL( new Blob([walletBlob], {type: 'application/octet-stream'}) );
		$scope.objectName = $scope.objectURL.substring( $scope.objectURL.lastIndexOf( '/' ) + 1 );

		$scope.notifier.success($translate.instant('NOTIFIER_SUCCESS_GENERATE_THE_WALLET') + " <b>wallet--" + $scope.objectName + ".db3</b>" );
	};

});

app.controller("NeoWalletCtrl", function($scope,$translate,$http,$sce,$interval) {
	$scope.wallet = null;
    $scope.walletType = "fileupload";
	$scope.filePassword = "";
	$scope.privateKeyData = "";
	$scope.WIFKeyData = "";
	$scope.PublicKeyEncodedData = "";

	$scope.txUnsignedData = "";
	$scope.txSignatureData = "";

	$scope.hostSelectIndex = 0;
	$scope.hostInfo = [
		{
			hostName	 : "NEO Testnet Seed1",
			hostProvider : "neo.org",
			restapi_host : "http://seed1.antshares.org",
			restapi_port : "20332",
			webapi_host  : "http://testnet.antchain.org",
			webapi_port  : "80",
		},
		{
			hostName	 : "NEO Testnet Seed2",
			hostProvider : "neo.org",
			restapi_host : "http://seed2.antshares.org",
			restapi_port : "20332",
			webapi_host  : "http://testnet.antchain.org",
			webapi_port  : "80",
		},
		{
			hostName	 : "NEO Testnet Seed3",
			hostProvider : "neo.org",
			restapi_host : "http://seed3.antshares.org",
			restapi_port : "20332",
			webapi_host  : "http://testnet.antchain.org",
			webapi_port  : "80",
		},
		{
			hostName	 : "NEO Testnet Seed4",
			hostProvider : "neo.org",
			restapi_host : "http://seed4.antshares.org",
			restapi_port : "20332",
			webapi_host  : "http://testnet.antchain.org",
			webapi_port  : "80",
		},
		{
			hostName	 : "NEO Testnet Seed5",
			hostProvider : "neo.org",
			restapi_host : "http://seed5.antshares.org",
			restapi_port : "20332",
			webapi_host  : "http://testnet.antchain.org",
			webapi_port  : "80",
		},
	];

	$scope.langSelectIndex = 0;
	$scope.langs = [
		{name:"简体中文",lang:"zh-hans"},
		{name:"English",lang:"en"},
	];

	$scope.txType 		= "128";
	$scope.txTypes 		= [];

	$scope.showOpenWallet = true;
	$scope.showTransaction = false;
	$scope.showBtnUnlock  = $scope.showBtnUnlockPrivateKey = $scope.showBtnUnlockWIFKey = $scope.showBtnUnlockExtSig = $scope.requirePass = false;

	$scope.notifier = Notifier;
	$scope.notifier.sce = $sce;
    $scope.notifier.scope = $scope;

	$scope.account = {
			privatekey: "",
			publickeyEncoded: "",
			publickeyHash: "",
			programHash: "",
			address: "",
	};
	$scope.accounts = [];
	$scope.accountSelectIndex = 0;

	$scope.issueAsset = {
		issueAssetID: "",
		issueAmount: "",
	}

	$scope.registerAsset = {
		assetName: "",
		assetAmount: "",
	}

	$scope.Transaction = {
		ToAddress: "",
		Amount: "",
	};
	$scope.coins = [];
	$scope.coinSelectIndex = 0;
	
	$interval(function(){
		var account = $scope.accounts[$scope.accountSelectIndex];
		if ( account ) {
			if (account.address != "" ) {
					$scope.getUnspent(account.address);
			}
		}
	},30000);

	$scope.init  = function() {
		$scope.connectNode();

		$scope.txTypes = [
			{name:'Transfer Asset',id:'128'},
			//{name:'Claim Coin',id:'2'},
			//{name:'Issue Asset',id:'1'},
        	//{name:'Register Asset',id:'64'},
        ];

	};

	$scope.changeLangSelectIndex = function($index) {
		$scope.langSelectIndex = $index;
		$translate.use($scope.langs[$index].lang);
        window.localStorage.lang = $scope.langs[$index].lang;
	};

	$scope.changehostSelectIndex = function($index) {
		$scope.hostSelectIndex = $index;
		$scope.connectNode();
		if ( $scope.accounts[$scope.accountSelectIndex] ) {
			$scope.getUnspent( $scope.accounts[$scope.accountSelectIndex].address );
		}
	};

	$scope.changeCoinSelectIndex = function($index) {
		$scope.coinSelectIndex = $index;
	};

	$scope.changeAcountSelectIndex = function($index) {
		$scope.accountSelectIndex = $index;
		$scope.getUnspent( $scope.accounts[$index].address );
	};

    $scope.openFileDialog  = function() {
		document.getElementById('fselector').click();
	};
		
	$scope.showContent = function($wallet) {
		$scope.wallet = $wallet;
		$scope.requirePass = true;

		$scope.notifier.info($translate.instant('NOTIFIER_FILE_SELECTED') + document.getElementById('fselector').files[0].name);
		
		//console.log( $wallet );
	};
	
	$scope.onFilePassChange = function () {
		if ( $scope.filePassword.length > 0 ) {
			$scope.showBtnUnlock = true;
		} else {
			$scope.showBtnUnlock = false;
		}
	};

	$scope.onPrivateKeyChange = function () {
		if ( $scope.privateKeyData.length == 64 ) {
			$scope.showBtnUnlockPrivateKey = true;
		} else {
			$scope.showBtnUnlockPrivateKey = false;
		}
	};

	$scope.onWIFKeyChange = function () {
		if ( $scope.WIFKeyData.length == 52 ) {
			$scope.showBtnUnlockWIFKey = true;
		} else {
			$scope.showBtnUnlockWIFKey = false;
		}
	};

	$scope.onPublicKeyEncodedChange = function () {
		if ( $scope.PublicKeyEncodedData.length == 66 ) {
			$scope.showBtnUnlockExtSig = true;
		} else {
			$scope.showBtnUnlockExtSig = false;
		}
	};
	
	$scope.decryptWallet = function () {

		try {
			if ( $scope.walletType == "externalsignature" ) {
				var ret = Wallet.GetAccountsFromPublicKeyEncoded( $scope.PublicKeyEncodedData );
				if ( ret == -1 ) {
					$scope.notifier.danger($translate.instant('NOTIFIER_PUBLICKEY_VERIFY_FAILED'));
					return;
				}

				$scope.notifier.info($translate.instant('NOTIFIER_SUCCESS_DECRYPT_THE_WALLET'));
				$scope.accounts = ret;

				$scope.showOpenWallet = false;
				$scope.showTransaction = true;

				// get unspent coins
				$scope.getUnspent($scope.accounts[0].address);

			} else if ( $scope.walletType == "pasteprivkey" ) {

				var ret = Wallet.GetAccountsFromPrivateKey( $scope.privateKeyData );
				if ( ret == -1 ) {
					$scope.notifier.danger($translate.instant('NOTIFIER_PRIVATEKEY_LENGTH_CHECK_FAILED'));
				} else if ( ret ) {
					$scope.notifier.info($translate.instant('NOTIFIER_SUCCESS_DECRYPT_THE_WALLET'));
					$scope.accounts = ret;

					$scope.showOpenWallet = false;
					$scope.showTransaction = true;

					// get unspent coins
					$scope.getUnspent($scope.accounts[0].address);
				}

			} else if ($scope.walletType == "pastewifkey") {

				var ret = Wallet.GetAccountsFromWIFKey( $scope.WIFKeyData );
				if ( ret == -1 ) {
					$scope.notifier.danger($translate.instant('NOTIFIER_WIF_LENGTH_CHECK_FAILED'));
				} else if ( ret == -2 ) {
					$scope.notifier.danger($translate.instant('NOTIFIER_WIF_VERIFY_FAILED'));
				} else if ( ret ) {
					$scope.notifier.info($translate.instant('NOTIFIER_SUCCESS_DECRYPT_THE_WALLET'));
					$scope.accounts = ret;

					$scope.showOpenWallet = false;
					$scope.showTransaction = true;

					// get unspent coins
					$scope.getUnspent($scope.accounts[0].address);
				}

			} else if ($scope.walletType == "fileupload") {

				var ret = Wallet.decryptWallet($scope.wallet, $scope.filePassword);
				if ( ret == -1 ) {
					$scope.notifier.danger($translate.instant('NOTIFIER_PASSWORD_VERIFY_FAILED'));
				} else if ( ret == -2 ) {
					$scope.notifier.danger($translate.instant('NOTIFIER_ACCOUNTS_VERIFY_FAILED'));
				} else {
					$scope.notifier.info($translate.instant('NOTIFIER_SUCCESS_DECRYPT_THE_WALLET'));
					$scope.accounts = ret;

					$scope.showOpenWallet = false;
					$scope.showTransaction = true;

					// get unspent coins
					$scope.getUnspent($scope.accounts[0].address);
				}

			}
		} catch (e) {
			//$scope.notifier.danger("");
		}
	};
	
	$scope.getUnspent = function ($address) {
			var host = $scope.hostInfo[$scope.hostSelectIndex];

			$http({
				method: 'GET',
				url: host.webapi_host + ':' + host.webapi_port + '/api/v1/address/get_unspent/' + $address,
			}).then(function (res) {
				if ( res.status == 200 ) {

					$scope.coins = [];

					for ( i=0; i<res.data.length; i++ ) {
						$scope.coins[i] = res.data[i];
					}

					//console.log($scope.coins);
				}
		    }).catch(err => console.log(err));
	}

	$scope.connectNode = function () {
			var host = $scope.hostInfo[$scope.hostSelectIndex];
			
			$scope.addressBrowseURL = host.webapi_host + ':' + host.webapi_port + '/address/';
			$scope.txBrowseURL 		= host.webapi_host + ':' + host.webapi_port + '/tx/';

			$http({
				method : 'POST',
				url : host.restapi_host + ':' + host.restapi_port,
				data: '{"jsonrpc": "2.0", "method": "getblockcount", "params": [], "id": 4}',
				headers: { "Content-Type": "application/json" }
			}).then(function (res) {
				if ( res.status == 200 ) {
					if ( res.data.result > 0 ) {
						console.log("Node Height:", res.data.result);
						$scope.notifier.info($translate.instant('NOTIFIER_SUCCESS_CONNECTED_TO_NODE') + " <b>" + $scope.hostInfo[$scope.hostSelectIndex].hostName + "</b>, " + $translate.instant('NOTIFIER_PROVIDED_BY') + $scope.hostInfo[$scope.hostSelectIndex].hostProvider + ".");
					} else {
						$scope.notifier.danger($translate.instant('NOTIFIER_CONNECTED_TO_NODE') + " <b>" + $scope.hostInfo[$scope.hostSelectIndex].hostName + "</b> " + $translate.instant('NOTIFIER_FAILURE'));
					}
				} else {
					$scope.notifier.danger($translate.instant('NOTIFIER_CONNECTED_TO_NODE') + " <b>" + $scope.hostInfo[$scope.hostSelectIndex].hostName + "</b> " + $translate.instant('NOTIFIER_FAILURE'));
				}
		    }).catch(function (res) {
		    	$scope.notifier.danger($translate.instant('NOTIFIER_CONNECTED_TO_NODE') + " <b>" + $scope.hostInfo[$scope.hostSelectIndex].hostName + "</b> " + $translate.instant('NOTIFIER_FAILURE'));
		    });
	};

	$scope.sendTransactionData = function($txData) {
		//console.log($txData);
		var host = $scope.hostInfo[$scope.hostSelectIndex];
		
		$http({
				method : 'POST',
				url : host.restapi_host + ':' + host.restapi_port,
				data: '{"jsonrpc": "2.0", "method": "sendrawtransaction", "params": ["' + $txData + '"], "id": 4}',
				headers: { "Content-Type": "application/json" }
			}).then(function (res) {
				if ( res.status == 200 ) {
					console.log(res.data);

					var txhash = reverseArray(hexstring2ab(Wallet.GetTxHash($txData.substring(0,$txData.length-103*2))));
					//var txhash = Wallet.GetTxHash($txData.substring(0,$txData.length-103*2));

					if ( res.data.result == true ) {
						$scope.notifier.success( $translate.instant('NOTIFIER_TRANSACTION_SUCCESS_TXHASH') + ab2hexstring(txhash) + " , <a target='_blank' href='"+$scope.txBrowseURL+ab2hexstring(txhash)+"'><b>" + $translate.instant('NOTIFIER_CLICK_HERE') + "</b></a>" );
					} else  {
						$scope.notifier.danger( $translate.instant('NOTIFIER_SEND_TRANSACTION_FAILED') + res.data.result )
					}
				}
		    }).catch(err => console.log(err));
	}

	$scope.MakeTxAndSend = function() {
		if ( $scope.txUnsignedData.length > 0 && $scope.txSignatureData.length == 128 ) {
			var publicKeyEncoded = $scope.accounts[$scope.accountSelectIndex].publickeyEncoded;
			var txRawData = Wallet.AddContract( $scope.txUnsignedData, $scope.txSignatureData, publicKeyEncoded );

			$scope.sendTransactionData( txRawData );
		} else {
			$scope.notifier.warning($translate.instant('NOTIFIER_INPUT_DATA_CHECK_FAILED'));
		}
	}

	$scope.issueTransaction = function() {
		if ( $scope.issueAsset.issueAssetID.length != 64 ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_ISSUE_ASSETID_CHECK_FAILED'));
			return;
		}

		if ( $scope.issueAsset.issueAmount > 100000000 ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_ISSUE_AMOUNT_CHECK_FAILED'));
			return;
		}

		var publicKeyEncoded = $scope.accounts[$scope.accountSelectIndex].publickeyEncoded;
		var txData = Wallet.IssueTransaction( $scope.issueAsset.issueAssetID, $scope.issueAsset.issueAmount, publicKeyEncoded );

		var privateKey = $scope.accounts[$scope.accountSelectIndex].privatekey;
		var sign = Wallet.signatureData( txData, privateKey );
		var txRawData = Wallet.AddContract( txData, sign, publicKeyEncoded );

		$scope.sendTransactionData( txRawData );
	}

	$scope.issueTransactionUnsigned = function() {
		if ( $scope.issueAsset.issueAssetID.length != 64 ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_ISSUE_ASSETID_CHECK_FAILED'));
			return;
		}

		if ( $scope.issueAsset.issueAmount > 100000000 ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_ISSUE_AMOUNT_CHECK_FAILED'));
			return;
		}

		var publicKeyEncoded = $scope.accounts[$scope.accountSelectIndex].publickeyEncoded;
		var txData = Wallet.IssueTransaction( $scope.issueAsset.issueAssetID, $scope.issueAsset.issueAmount, publicKeyEncoded );

		$scope.txUnsignedData = txData;
	}

	$scope.registerTransactionUnsigned = function() {
		if ( $scope.registerAsset.assetAmount > 100000000 ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_REGISTER_AMOUNT_CHECK_FAILED'));
			return;
		}
		
		if ( $scope.registerAsset.assetName.length > 127 ) {
			return;
		}

		var publicKeyEncoded = $scope.accounts[$scope.accountSelectIndex].publickeyEncoded;
		var txData = Wallet.RegisterTransaction( $scope.registerAsset.assetName, $scope.registerAsset.assetAmount, publicKeyEncoded );

		$scope.txUnsignedData = txData;
	}

	$scope.registerTransaction = function() {

		if ( $scope.registerAsset.assetAmount > 100000000 ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_REGISTER_AMOUNT_CHECK_FAILED'));
			return;
		}
		
		if ( $scope.registerAsset.assetName.length > 127 ) {
			return;
		}

		var publicKeyEncoded = $scope.accounts[$scope.accountSelectIndex].publickeyEncoded;
		var txData = Wallet.RegisterTransaction( $scope.registerAsset.assetName, $scope.registerAsset.assetAmount, publicKeyEncoded );	

		var privateKey = $scope.accounts[$scope.accountSelectIndex].privatekey;
		var sign = Wallet.signatureData( txData, privateKey );
		var txRawData = Wallet.AddContract( txData, sign, publicKeyEncoded );

		$scope.sendTransactionData( txRawData );
	}

	$scope.transferTransactionUnsigned = function() {
		var reg = /^[0-9]{1,19}([.][0-9]{0,8}){0,1}$/;     
		var r = $scope.Transaction.Amount.match(reg);
		if ( r == null ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_AMOUNT_FORMAT_CHECK_FAILED'));
			return false;
		}

		if ( parseFloat($scope.coins[$scope.coinSelectIndex].balance) < parseFloat($scope.Transaction.Amount) ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_NOT_ENOUGH_VALUE') + ", " + $translate.instant('ASSET') + ": " + $scope.coins[$scope.coinSelectIndex].name + ", " + $translate.instant('BALANCE') + ": <b>" + $scope.coins[$scope.coinSelectIndex].balance + "</b>, " + $translate.instant('NOTIFIER_SEND_AMOUNT') + ": <b>" + $scope.Transaction.Amount + "</b>" );
			return false;
		}

		var publicKeyEncoded = $scope.accounts[$scope.accountSelectIndex].publickeyEncoded;
		var txData = Wallet.TransferTransaction($scope.coins[$scope.coinSelectIndex],publicKeyEncoded,$scope.Transaction.ToAddress,$scope.Transaction.Amount);
		if ( txData == -1 ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_ADDRESS_VERIFY_FAILED'));
			return;
		}

		$scope.txUnsignedData = txData;
	}

	$scope.transferTransaction = function () {
		var reg = /^[0-9]{1,19}([.][0-9]{0,8}){0,1}$/;     
		var r = $scope.Transaction.Amount.match(reg);
		if ( r == null ) {
			$scope.notifier.warning($translate.instant('NOTIFIER_AMOUNT_FORMAT_CHECK_FAILED'));
			return false;
		}

		if ( parseFloat($scope.coins[$scope.coinSelectIndex].balance) < parseFloat($scope.Transaction.Amount) ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_NOT_ENOUGH_VALUE') + ", " + $translate.instant('ASSET') + ": " + $scope.coins[$scope.coinSelectIndex].name + ", " + $translate.instant('BALANCE') + ": <b>" + $scope.coins[$scope.coinSelectIndex].balance + "</b>, " + $translate.instant('NOTIFIER_SEND_AMOUNT') + ": <b>" + $scope.Transaction.Amount + "</b>" );
			return false;
		}

		var publicKeyEncoded = $scope.accounts[$scope.accountSelectIndex].publickeyEncoded;
		var txData = Wallet.TransferTransaction($scope.coins[$scope.coinSelectIndex],publicKeyEncoded,$scope.Transaction.ToAddress,$scope.Transaction.Amount);
		if ( txData == -1 ) {
			$scope.notifier.danger($translate.instant('NOTIFIER_ADDRESS_VERIFY_FAILED'));
			return;
		}

		var privateKey = $scope.accounts[$scope.accountSelectIndex].privatekey;
		var sign = Wallet.signatureData( txData, privateKey );
		var txRawData = Wallet.AddContract( txData, sign, publicKeyEncoded );

		$scope.sendTransactionData( txRawData );
	};
});

var Notifier = {
			show 	: false,
			class	: "",
			icon 	: "",
			message	: "",
			timer   : null,
		    sce     : null,
		    scope   : null,

		    open: function open() {
		        this.show = true;
		        if (!this.scope.$$phase) this.scope.$apply();
		    },

		    close: function close() {
		        this.show = false;
		        if (!this.scope.$$phase) this.scope.$apply();
		    },

		    warning: function warning(msg) {
		        this.class = "alert-warning",
		        this.icon  = "glyphicon glyphicon-question-sign",
		        this.showAlert(this.class, msg);
		    },

		    info: function info(msg) {
		        this.class = "alert-info",
		        this.icon  = "glyphicon glyphicon-info-sign",
		        this.showAlert(this.class, msg);
		        this.setTimer();
		    },

		    danger: function danger(msg) {
		    	this.class = "alert-danger",
		    	this.icon  = "glyphicon glyphicon-remove-sign",
		        this.showAlert(this.class, msg);
		    },

		    success: function success(msg) {
		    	this.class = "alert-success",
		    	this.icon  = "glyphicon glyphicon-ok-sign",
		        this.showAlert(this.class, msg);
		    },

		    showAlert: function showAlert(_class, msg) {
		    	clearTimeout(this.timer);
		        this.class = _class;
		        this.message = this.sce.trustAsHtml(msg);
		        this.open();
		    },

			setTimer: function setTimer() {
		        var _this = this;
		        clearTimeout(_this.timer);
		        _this.timer = setTimeout(function () {
		            _this.show = false;
		            if (!_this.scope.$$phase) _this.scope.$apply();
		        }, 5000);
		    }
};