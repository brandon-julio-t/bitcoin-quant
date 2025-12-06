from __future__ import annotations

import argparse
from datetime import datetime, timezone
from typing import Iterable, Sequence

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import yfinance as yf
from ta.momentum import StochasticOscillator
from ta.volatility import BollingerBands


def fetch_ohlcv(
    symbol: str,
    period: str,
    interval: str,
) -> pd.DataFrame:
    """
    Download OHLCV data for the given symbol from Yahoo Finance.

    Raises:
        ValueError: if no data is returned.
    """
    data = yf.download(
        symbol,
        period=period,
        interval=interval,
        progress=False,
        ignore_tz=True,
    )
    if data.empty:
        raise ValueError(f"No data returned for {symbol} with period {period}.")

    data = data.reset_index()
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = [
            "_".join(level for level in col if level)
            for col in data.columns.to_flat_index()
        ]

    def first_present(candidates: Sequence[str]) -> str:
        for candidate in candidates:
            if candidate in data.columns:
                return candidate
        raise ValueError(f"Missing expected columns: {candidates}")

    open_col = first_present(("Open", "Open_" + symbol))
    high_col = first_present(("High", "High_" + symbol))
    low_col = first_present(("Low", "Low_" + symbol))
    close_col = first_present(
        ("Close", "Close_" + symbol, "Adj Close", "Adj Close_" + symbol)
    )
    volume_col = first_present(("Volume", "Volume_" + symbol))

    data = data.rename(
        columns={
            open_col: "Open",
            high_col: "High",
            low_col: "Low",
            close_col: "Close",
            volume_col: "Volume",
        }
    )
    ts_column = next(
        (
            candidate
            for candidate in ("Date", "Datetime", "date", "datetime")
            if candidate in data.columns
        ),
        None,
    )
    if ts_column is None:
        # Fall back to the first column if Yahoo changes the label again
        ts_column = data.columns[0]

    data = data.rename(columns={ts_column: "timestamp"})
    data["timestamp"] = pd.to_datetime(data["timestamp"])
    return data


def add_moving_averages(data: pd.DataFrame, spans: Iterable[int]) -> pd.DataFrame:
    """Append exponential moving averages for each span."""
    result = data.copy()
    for span in spans:
        result[f"ema_{span}"] = result["Close"].ewm(span=span, adjust=False).mean()
    return result


def add_bollinger_bands(
    data: pd.DataFrame, window: int = 20, std_dev: float = 2.0
) -> pd.DataFrame:
    """Append Bollinger Bands columns using the ta library."""
    indicator = BollingerBands(close=data["Close"], window=window, window_dev=std_dev)
    result = data.copy()
    result["bb_mid"] = indicator.bollinger_mavg()
    result["bb_upper"] = indicator.bollinger_hband()
    result["bb_lower"] = indicator.bollinger_lband()
    return result


def add_stoch_oscillator(
    data: pd.DataFrame, window: int = 5, smooth_window: int = 3
) -> pd.DataFrame:
    """Append stochastic oscillator (%K and %D) columns."""
    oscillator = StochasticOscillator(
        high=data["High"],
        low=data["Low"],
        close=data["Close"],
        window=window,
        smooth_window=smooth_window,
    )
    result = data.copy()
    result["stoch_k"] = oscillator.stoch()
    result["stoch_d"] = oscillator.stoch_signal()
    return result


def build_chart(data: pd.DataFrame, ema_spans: Sequence[int]) -> go.Figure:
    """Create a two-panel chart with price/indicators and stochastic oscillator."""
    fig = make_subplots(
        rows=2,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.05,
        row_heights=[0.7, 0.3],
    )

    fig.add_trace(
        go.Candlestick(
            name="Price",
            x=data["timestamp"],
            open=data["Open"],
            high=data["High"],
            low=data["Low"],
            close=data["Close"],
            increasing_line_color="#26a69a",
            decreasing_line_color="#ef5350",
            showlegend=False,
        ),
        row=1,
        col=1,
    )

    fig.add_trace(
        go.Scatter(
            name="BB Upper",
            x=data["timestamp"],
            y=data["bb_upper"],
            mode="lines",
            line=dict(color="#9e9e9e", width=1),
            legendgroup="bollinger",
        ),
        row=1,
        col=1,
    )
    fig.add_trace(
        go.Scatter(
            name="BB Lower",
            x=data["timestamp"],
            y=data["bb_lower"],
            mode="lines",
            line=dict(color="#9e9e9e", width=1),
            fill="tonexty",
            fillcolor="rgba(158,158,158,0.08)",
            legendgroup="bollinger",
        ),
        row=1,
        col=1,
    )
    fig.add_trace(
        go.Scatter(
            name="BB Mid",
            x=data["timestamp"],
            y=data["bb_mid"],
            mode="lines",
            line=dict(color="#bdbdbd", width=1, dash="dot"),
            legendgroup="bollinger",
        ),
        row=1,
        col=1,
    )

    for span in ema_spans:
        fig.add_trace(
            go.Scatter(
                name=f"EMA {span}",
                x=data["timestamp"],
                y=data[f"ema_{span}"],
                mode="lines",
                line=dict(width=2),
            ),
            row=1,
            col=1,
        )

    fig.add_trace(
        go.Scatter(
            name="%K",
            x=data["timestamp"],
            y=data["stoch_k"],
            mode="lines",
            line=dict(color="#42a5f5", width=2),
        ),
        row=2,
        col=1,
    )
    fig.add_trace(
        go.Scatter(
            name="%D",
            x=data["timestamp"],
            y=data["stoch_d"],
            mode="lines",
            line=dict(color="#ef6c00", width=2),
        ),
        row=2,
        col=1,
    )

    for level, color in ((80, "#c62828"), (20, "#2e7d32")):
        fig.add_hline(
            y=level,
            line=dict(color=color, width=1, dash="dash"),
            row=2,
            col=1,
        )

    fig.update_layout(
        title="BTC-USD with Bollinger Bands, EMAs, and Stochastic (TradingView-style)",
        template="plotly_dark",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        xaxis=dict(showgrid=False),
        xaxis2=dict(showgrid=False),
        yaxis_title="Price (USD)",
        yaxis2_title="Stochastic %",
        hovermode="x unified",
        margin=dict(l=60, r=30, t=60, b=40),
    )

    fig.update_yaxes(row=2, col=1, range=[0, 100])
    fig.update_xaxes(rangeslider=dict(visible=False))
    return fig


TIMEFRAME_PRESETS = {
    "4h": {"period": "180d", "interval": "4h"},
    "1D": {"period": "730d", "interval": "1d"},
    "1W": {"period": "max", "interval": "1wk"},
    "1M": {"period": "max", "interval": "1mo"},
}


def resolve_timeframe(
    timeframe: str | None, period: str, interval: str
) -> tuple[str, str]:
    """
    Use a TradingView-style timeframe preset when provided; otherwise fall back to
    explicit period/interval args.
    """
    if timeframe is None:
        return period, interval
    preset = TIMEFRAME_PRESETS.get(timeframe)
    if not preset:
        raise ValueError(
            f"Unsupported timeframe '{timeframe}'. Expected one of {sorted(TIMEFRAME_PRESETS)}."
        )
    return preset["period"], preset["interval"]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Visualize BTC-USD with Bollinger Bands, EMAs, and Stochastic oscillator.",
    )
    parser.add_argument(
        "--timeframe",
        choices=TIMEFRAME_PRESETS.keys(),
        help="Optional TradingView-style timeframe preset (4h, 1D, 1W, 1M). Overrides --period/--interval.",
    )
    parser.add_argument(
        "--period",
        default="180d",
        help="Yahoo Finance period (e.g., 90d, 180d, 1y, max).",
    )
    parser.add_argument(
        "--interval",
        default="1d",
        help="Yahoo Finance interval (e.g., 1h, 4h, 1d).",
    )
    args = parser.parse_args()

    period, interval = resolve_timeframe(args.timeframe, args.period, args.interval)
    ema_spans = (13, 21, 50, 100)
    data = fetch_ohlcv(symbol="BTC-USD", period=period, interval=interval)
    data = add_moving_averages(data, ema_spans)
    data = add_bollinger_bands(data)
    data = add_stoch_oscillator(data)
    data = data.dropna()

    fig = build_chart(data, ema_spans)
    print(f"Last update: {datetime.now(timezone.utc):%Y-%m-%d %H:%M:%S} UTC")
    fig.show()


if __name__ == "__main__":
    main()
