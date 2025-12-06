# Bitcoin Quantitative Trading Chart

A TradingView-style Bitcoin chart visualization with technical indicators and interactive controls.

## Features

- **Interactive Web Interface**: Full-featured Dash web application
- **Timeframe Selection**: Choose from 4h, 1d, 1w, or 1m intervals
- **Date Range Picker**: Select custom start and end dates for analysis
- **Candlestick Chart**: Interactive Bitcoin price chart
- **Bollinger Bands**: Upper, middle, and lower bands (20-period, 2 std dev)
- **Exponential Moving Averages (EMAs)**:
  - EMA 13 (Blue)
  - EMA 21 (Orange)
  - EMA 50 (Purple)
  - EMA 100 (Yellow/Amber)
- **Stochastic Oscillator**: %K and %D lines (5, 3, 3) with overbought/oversold levels

## Installation

This project uses `uv` for dependency management. Install dependencies with:

```bash
uv sync
```

## Usage

Run the script to start the web application:

```bash
uv run python main.py
```

The application will start a local web server at `http://127.0.0.1:8050`. Open this URL in your browser to access the interactive chart interface.

### Using the Interface

1. **Select Timeframe**: Choose your preferred timeframe from the dropdown (4h, 1d, 1w, 1m)
2. **Pick Date Range**: Use the date pickers to select start and end dates
3. **Update Chart**: Click the "Update Chart" button to refresh the chart with your selections

The chart updates dynamically based on your selections, showing all technical indicators calculated for the selected timeframe and date range.

## Technical Details

### Supported Timeframes

- **4 Hours (4h)**: Resampled from 1-hour data
- **1 Day (1d)**: Daily candlesticks
- **1 Week (1w)**: Weekly candlesticks
- **1 Month (1m)**: Monthly candlesticks

### Data Source

Bitcoin price data is fetched from Yahoo Finance using the `yfinance` library. The application supports custom date ranges and automatically handles data resampling for the 4-hour timeframe.

## Dependencies

- `yfinance`: Bitcoin price data fetching
- `pandas`: Data manipulation
- `plotly`: Interactive chart visualization
- `numpy`: Numerical computations
- `dash`: Web application framework
- `dash-bootstrap-components`: UI components for Dash
