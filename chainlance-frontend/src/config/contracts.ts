export const CHAINLANCE_ESCROW_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "string",
                "name": "milestoneId",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "client",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "freelancer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "EscrowCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "string",
                "name": "milestoneId",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "client",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "EscrowRefunded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "string",
                "name": "milestoneId",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "freelancer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "EscrowReleased",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_milestoneId",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "_freelancer",
                "type": "address"
            }
        ],
        "name": "createEscrow",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "escrows",
        "outputs": [
            {
                "internalType": "string",
                "name": "milestoneId",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "client",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "freelancer",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "isReleased",
                "type": "bool"
            },
            {
                "internalType": "bool",
                "name": "isRefunded",
                "type": "bool"
            },
            {
                "internalType": "uint256",
                "name": "createdAt",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_milestoneId",
                "type": "string"
            }
        ],
        "name": "getEscrow",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "string",
                        "name": "milestoneId",
                        "type": "string"
                    },
                    {
                        "internalType": "address",
                        "name": "client",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "freelancer",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bool",
                        "name": "isReleased",
                        "type": "bool"
                    },
                    {
                        "internalType": "bool",
                        "name": "isRefunded",
                        "type": "bool"
                    },
                    {
                        "internalType": "uint256",
                        "name": "createdAt",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct ChainLanceEscrow.EscrowTransaction",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_milestoneId",
                "type": "string"
            }
        ],
        "name": "refund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_milestoneId",
                "type": "string"
            }
        ],
        "name": "release",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// REPLACE THIS WITH YOUR DEPLOYED CONTRACT ADDRESS
export const CHAINLANCE_ESCROW_ADDRESS = "0x0000000000000000000000000000000000000000";
