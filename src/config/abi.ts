export const PROJECT_CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "projectId",
                "type": "uint256"
            }
        ],
        "name": "getProjectDetails",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "projectOwner",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "projectToken",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "contributionTokenAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "fundingGoal",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "softCap",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "minContribution",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "maxContribution",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "tokenPrice",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "startTime",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "endTime",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "totalRaised",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "totalProjectTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "projectTokenLogoURI",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amountTokensForSale",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "liquidityPercentage",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "lockDuration",
                        "type": "uint256"
                    },
                    {
                        "internalType": "enum ProjectStatus",
                        "name": "status",
                        "type": "uint8"
                    },
                    {
                        "internalType": "bool",
                        "name": "liquidityAdded",
                        "type": "bool"
                    },
                    {
                        "internalType": "bool",
                        "name": "vestingEnabled",
                        "type": "bool"
                    },
                    {
                        "internalType": "uint256",
                        "name": "vestingCliff",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "vestingDuration",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "vestingInterval",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "vestingInitialRelease",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct Project",
                "name": "project",
                "type": "tuple"
            },
            {
                "internalType": "uint256",
                "name": "progressPercentage",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "timeRemaining",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "canContribute",
                "type": "bool"
            },
            {
                "internalType": "uint256",
                "name": "requiredLiquidityTokens",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "depositedLiquidityTokens",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "totalContributors",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
]