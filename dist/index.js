"use strict";
// src/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const pools_1 = __importDefault(require("./pools"));
const web3_js_1 = require("@solana/web3.js");
const gamba_core_v2_1 = require("gamba-core-v2");
const config = {
    // Add your Solana RPC URL, can be obtained from https://dev.helius.xyz
    solanaRpcUrl: "https://mainnet.helius-rpc.com/?api-key=5566db19-f90e-48fc-8b76-e739b5632756",
    // Add your Telegram bot token, can be obtained from @BotFather
    botToken: "7081073059:AAFqwsPHlZjh9qgioygJZU5YuO1U_8S6ON8",
    // Add your Telegram chat ID, can be obtained from @getmyid
    chatId: "4182424125",
};
const web3Connection = new web3_js_1.Connection(config.solanaRpcUrl, "confirmed");
const bot = new node_telegram_bot_api_1.default(config.botToken, { polling: false });
const gambaProvider = new gamba_core_v2_1.GambaProvider(web3Connection, {
    commitment: "confirmed",
});
gambaProvider.gambaProgram.addEventListener("GameSettled", (data, slot, signature) => {
    const shortUser = `${data.user.toString().slice(0, 6)}...${data.user
        .toString()
        .slice(-6)}`;
    const formatMultiplier = (bps) => `${(bps / 100).toFixed(2)}%`;
    const metadataInfo = data.metadata
        ? data.metadata.split(":").slice(1).join(":").trim().replace(/-/g, "\\-")
        : "N/A";
    const tokenMint = data.tokenMint;
    const poolConfig = pools_1.default[tokenMint];
    if (poolConfig) {
        // Determine if it's a win based on payout
        const isWin = data.payout > 0;
        const resultEmoji = isWin ? "🟢" : "🔴";
        const resultText = isWin ? "WIN" : "LOSS";
        // Format the amount using the pool's decimals
        const formatAmount = (amount, decimals) => {
            const formattedAmount = Number(amount) / Math.pow(10, decimals);
            return formattedAmount.toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            });
        };
        // Constructing the advanced message with MarkdownV2 formatting
        const message = [
            `*${resultEmoji} Game Settled ${resultText} ${resultEmoji}*`,
            `*User:* \`${shortUser}\``,
            `*Wager:* \`${formatAmount(data.wager, poolConfig.decimals)} ${poolConfig.symbol}\``,
            `*Payout:* \`${formatAmount(data.payout, poolConfig.decimals)} ${poolConfig.symbol}\``,
            `*Multiplier:* \`${formatMultiplier(data.multiplierBps)}\``,
            `*Time:* \`${new Date().toLocaleString()}\``,
            `*Metadata:* \`${metadataInfo}\``,
            "",
            "",
            "Built by [bankkroll](https://twitter.com/bankkroll_eth)",
        ].join("\n");
        const options = {
            parse_mode: "MarkdownV2",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "View Transaction",
                            url: `https://explorer.gamba.so/tx/${signature}`,
                        },
                    ],
                ],
            },
        };
        bot
            .sendMessage(config.chatId, message, options)
            .then(() => {
            console.log("Message sent to Telegram successfully.");
        })
            .catch((error) => {
            console.error("Failed to send message to Telegram:", error);
        });
    }
    else {
        console.error(`Pool configuration not found for token mint: ${tokenMint}`);
    }
});
