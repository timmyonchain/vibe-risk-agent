# Project Description (for submission form)

Most trading tools still assume a human is the one clicking buy and sell. Vibe Risk Agent breaks that assumption: you describe your risk profile in one plain-English sentence, and an autonomous agent takes over the entire trading loop.

Perception: the agent pulls live BTC price, RSI, moving averages, and funding rate directly from Bitget's public market data API, refreshed continuously, no manual chart-watching.

Decision: that market data, plus your risk sentence, is sent to Groq's llama-3.3-70b model, which returns a structured decision (buy/sell/hold), position size, stop-loss, take-profit, and its reasoning in plain language.

Execution: if the agent decides to trade, it opens a paper position and permanently logs it (timestamp, price, quantity, balance change) to a database, the exact verifiable record this hackathon asks for.

Risk management: the agent checks its own open position against your stated stop-loss and take-profit on every cycle, and closes itself automatically the moment either is hit, no human babysitting required.

We built directly against Bitget's public market and funding-rate endpoints (ticker, candles, funding rate), keeping the whole loop fully autonomous and verifiable end to end.
