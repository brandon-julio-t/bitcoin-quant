"""
Bitcoin Trading Chart with Technical Indicators
Displays a TradingView-style chart with Bollinger Bands, EMAs, and Stochastic oscillator.
"""

import yfinance as yf
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Tuple, Optional
from datetime import datetime, timedelta
import dash
from dash import dcc, html, Input, Output, State
from dash.exceptions import PreventUpdate
import dash_bootstrap_components as dbc


def fetch_bitcoin_data(
    interval: str = "1d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch Bitcoin price data from Yahoo Finance.

    Args:
        interval: Data interval ("1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo")
        start_date: Start date in YYYY-MM-DD format (optional)
        end_date: End date in YYYY-MM-DD format (optional)
        period: Time period for data (e.g., "1mo", "3mo", "6mo", "1y", "2y") - used if dates not provided

    Returns:
        DataFrame with OHLCV data
    """
    ticker = yf.Ticker("BTC-USD")

    # Map user-friendly intervals to yfinance intervals
    # For 4h, we'll fetch 1h data and resample
    interval_map = {
        "4h": "1h",  # Will resample to 4h
        "1d": "1d",
        "1w": "1wk",
        "1m": "1mo",
    }
    yf_interval = interval_map.get(interval, interval)
    needs_resample = interval == "4h"

    if start_date and end_date:
        data = ticker.history(start=start_date, end=end_date, interval=yf_interval)
    elif period:
        data = ticker.history(period=period, interval=yf_interval)
    else:
        # Default to 6 months if nothing specified
        # For 4h, we need more data to resample properly
        period_to_use = "1y" if needs_resample else "6mo"
        data = ticker.history(period=period_to_use, interval=yf_interval)

    # Resample 1h data to 4h if needed
    if needs_resample and not data.empty:
        # Resample OHLCV data properly
        data = (
            data.resample("4H")
            .agg(
                {
                    "Open": "first",
                    "High": "max",
                    "Low": "min",
                    "Close": "last",
                    "Volume": "sum",
                }
            )
            .dropna()
        )

    return data


def calculate_ema(series: pd.Series, period: int) -> pd.Series:
    """
    Calculate Exponential Moving Average.

    Args:
        series: Price series
        period: EMA period

    Returns:
        Series with EMA values
    """
    return series.ewm(span=period, adjust=False).mean()


def calculate_bollinger_bands(
    series: pd.Series, period: int = 20, std_dev: float = 2.0
) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """
    Calculate Bollinger Bands.

    Args:
        series: Price series
        period: Moving average period
        std_dev: Standard deviation multiplier

    Returns:
        Tuple of (upper_band, middle_band, lower_band)
    """
    middle_band = series.rolling(window=period).mean()
    std = series.rolling(window=period).std()
    upper_band = middle_band + (std * std_dev)
    lower_band = middle_band - (std * std_dev)
    return upper_band, middle_band, lower_band


def calculate_stochastic(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    k_period: int = 5,
    d_period: int = 3,
    smooth_k: int = 3,
) -> Tuple[pd.Series, pd.Series]:
    """
    Calculate Stochastic Oscillator.

    Args:
        high: High prices
        low: Low prices
        close: Close prices
        k_period: %K period
        d_period: %D period
        smooth_k: Smoothing period for %K

    Returns:
        Tuple of (%K, %D)
    """
    lowest_low = low.rolling(window=k_period).min()
    highest_high = high.rolling(window=k_period).max()

    # Raw %K
    raw_k = 100 * ((close - lowest_low) / (highest_high - lowest_low))

    # Smooth %K
    k_percent = raw_k.rolling(window=smooth_k).mean()

    # %D (moving average of %K)
    d_percent = k_percent.rolling(window=d_period).mean()

    return k_percent, d_percent


def get_bitcoin_halving_signals():
    """
    Get Bitcoin halving dates and calculate top/bottom signals.

    Returns:
        Dictionary with halving dates, top signals, and bottom signals
    """
    # Bitcoin halving dates
    halving_dates = [
        datetime(2012, 11, 28),
        datetime(2016, 7, 9),
        datetime(2020, 5, 11),
        datetime(2024, 4, 20),
    ]

    # Calculate signals for each halving
    top_signals = []
    bottom_signals = []

    for halving_date in halving_dates:
        # Top signal: 17 months (~518 days) after halving month
        # Using exact day count: 518 days
        top_signal = halving_date + timedelta(days=518)
        top_signals.append(top_signal)

        # Bottom signal: 29 months (~883 days) after halving month
        # Using exact day count: 883 days
        bottom_signal = halving_date + timedelta(days=883)
        bottom_signals.append(bottom_signal)

    return {
        "halvings": halving_dates,
        "top_signals": top_signals,
        "bottom_signals": bottom_signals,
    }


def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate all technical indicators: Bollinger Bands, EMAs, and Stochastic.

    Args:
        df: DataFrame with OHLCV data

    Returns:
        DataFrame with added indicator columns
    """
    # Bollinger Bands (period 20, std 2)
    bb_upper, bb_middle, bb_lower = calculate_bollinger_bands(
        df["Close"], period=20, std_dev=2.0
    )
    df["BB_Upper"] = bb_upper
    df["BB_Middle"] = bb_middle
    df["BB_Lower"] = bb_lower

    # Exponential Moving Averages
    df["EMA_13"] = calculate_ema(df["Close"], period=13)
    df["EMA_21"] = calculate_ema(df["Close"], period=21)
    df["EMA_50"] = calculate_ema(df["Close"], period=50)
    df["EMA_100"] = calculate_ema(df["Close"], period=100)

    # Stochastic Oscillator (5, 3, 3)
    stoch_k, stoch_d = calculate_stochastic(
        df["High"], df["Low"], df["Close"], k_period=5, d_period=3, smooth_k=3
    )
    df["Stoch_K"] = stoch_k
    df["Stoch_D"] = stoch_d

    return df


def create_tradingview_chart(df: pd.DataFrame) -> go.Figure:
    """
    Create a TradingView-style chart with candlesticks and indicators.

    Args:
        df: DataFrame with OHLCV and indicator data

    Returns:
        Plotly figure object
    """
    # Create subplots: main chart and stochastic oscillator
    fig = make_subplots(
        rows=2,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=[0.7, 0.3],
        subplot_titles=("Bitcoin Price Chart", "Stochastic Oscillator"),
    )

    # Main chart: Candlesticks
    fig.add_trace(
        go.Candlestick(
            x=df.index,
            open=df["Open"],
            high=df["High"],
            low=df["Low"],
            close=df["Close"],
            name="BTC-USD",
            increasing_line_color="#26a69a",
            decreasing_line_color="#ef5350",
        ),
        row=1,
        col=1,
    )

    # Bollinger Bands
    fig.add_trace(
        go.Scatter(
            x=df.index,
            y=df["BB_Upper"],
            name="BB Upper",
            line=dict(color="rgba(250, 250, 250, 0.3)", width=1),
            showlegend=True,
        ),
        row=1,
        col=1,
    )

    fig.add_trace(
        go.Scatter(
            x=df.index,
            y=df["BB_Middle"],
            name="BB Middle",
            line=dict(color="rgba(250, 250, 250, 0.5)", width=1, dash="dash"),
            showlegend=True,
        ),
        row=1,
        col=1,
    )

    fig.add_trace(
        go.Scatter(
            x=df.index,
            y=df["BB_Lower"],
            name="BB Lower",
            line=dict(color="rgba(250, 250, 250, 0.3)", width=1),
            showlegend=True,
            fill="tonexty",
            fillcolor="rgba(250, 250, 250, 0.1)",
        ),
        row=1,
        col=1,
    )

    # EMAs
    ema_colors = {
        "EMA_13": "#2962FF",  # Blue
        "EMA_21": "#FF6D00",  # Orange
        "EMA_50": "#9C27B0",  # Purple
        "EMA_100": "#F9A825",  # Yellow/Amber
    }

    for ema_name, color in ema_colors.items():
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df[ema_name],
                name=ema_name.replace("_", " "),
                line=dict(color=color, width=1.5),
                showlegend=True,
            ),
            row=1,
            col=1,
        )

    # Stochastic Oscillator
    fig.add_trace(
        go.Scatter(
            x=df.index,
            y=df["Stoch_K"],
            name="Stoch %K",
            line=dict(color="#2962FF", width=1.5),
            showlegend=True,
        ),
        row=2,
        col=1,
    )

    fig.add_trace(
        go.Scatter(
            x=df.index,
            y=df["Stoch_D"],
            name="Stoch %D",
            line=dict(color="#FF6D00", width=1.5),
            showlegend=True,
        ),
        row=2,
        col=1,
    )

    # Add overbought/oversold lines for Stochastic (80 and 20)
    fig.add_hline(
        y=80,
        line_dash="dash",
        line_color="rgba(255, 255, 255, 0.5)",
        annotation_text="Overbought",
        row=2,
        col=1,
    )

    fig.add_hline(
        y=20,
        line_dash="dash",
        line_color="rgba(255, 255, 255, 0.5)",
        annotation_text="Oversold",
        row=2,
        col=1,
    )

    # Add Bitcoin halving signals
    signals = get_bitcoin_halving_signals()
    # Ensure timezone-naive timestamps for comparison
    date_range_start = (
        pd.Timestamp(df.index.min()).tz_localize(None)
        if df.index.tz
        else pd.Timestamp(df.index.min())
    )
    date_range_end = (
        pd.Timestamp(df.index.max()).tz_localize(None)
        if df.index.tz
        else pd.Timestamp(df.index.max())
    )

    # Get price range for annotation positioning
    price_min = df["Low"].min()
    price_max = df["High"].max()
    price_range = price_max - price_min

    # Helper function to find nearest candlestick timestamp
    def find_nearest_candlestick(target_date: pd.Timestamp) -> pd.Timestamp:
        """Find the nearest candlestick timestamp to align vertical lines."""
        # Ensure timezone compatibility
        target_ts = pd.Timestamp(target_date)
        if df.index.tz is not None:
            # If index is timezone-aware, make target timezone-aware
            if target_ts.tz is None:
                target_ts = target_ts.tz_localize(df.index.tz)
        else:
            # If index is timezone-naive, make target timezone-naive
            if target_ts.tz is not None:
                target_ts = target_ts.tz_localize(None)

        # Find the index of the nearest timestamp
        idx = df.index.get_indexer([target_ts], method="nearest")[0]
        return df.index[idx]

    # Add halving date vertical lines using shapes
    # Align to nearest candlestick for perfect alignment
    for i, halving_date in enumerate(signals["halvings"]):
        halving_ts = pd.Timestamp(halving_date)
        if date_range_start <= halving_ts <= date_range_end:
            # Align to nearest candlestick
            aligned_ts = find_nearest_candlestick(halving_ts)
            fig.add_shape(
                type="line",
                x0=aligned_ts,
                x1=aligned_ts,
                y0=price_min,
                y1=price_max,
                xref="x",
                yref="y",
                line=dict(color="rgba(255, 255, 0, 0.8)", width=1, dash="dot"),
                layer="above",
            )
            fig.add_annotation(
                x=aligned_ts,
                y=price_max,
                xref="x",
                yref="y",
                text=f"Halving {i+1}",
                showarrow=False,
                yshift=10,
                font=dict(color="rgba(255, 255, 0, 1.0)", size=11),
            )

    # Add top signal vertical lines (17 months after halving)
    for i, top_signal in enumerate(signals["top_signals"]):
        top_ts = pd.Timestamp(top_signal)
        if date_range_start <= top_ts <= date_range_end:
            # Align to nearest candlestick
            aligned_ts = find_nearest_candlestick(top_ts)
            fig.add_shape(
                type="line",
                x0=aligned_ts,
                x1=aligned_ts,
                y0=price_min,
                y1=price_max,
                xref="x",
                yref="y",
                line=dict(color="rgba(0, 255, 0, 0.8)", width=1, dash="dash"),
                layer="above",
            )
            fig.add_annotation(
                x=aligned_ts,
                y=price_max,
                xref="x",
                yref="y",
                text=f"Top {i+1}",
                showarrow=False,
                yshift=10,
                font=dict(color="rgba(0, 255, 0, 1.0)", size=11),
            )

    # Add bottom signal vertical lines (29 months after halving)
    for i, bottom_signal in enumerate(signals["bottom_signals"]):
        bottom_ts = pd.Timestamp(bottom_signal)
        if date_range_start <= bottom_ts <= date_range_end:
            # Align to nearest candlestick
            aligned_ts = find_nearest_candlestick(bottom_ts)
            fig.add_shape(
                type="line",
                x0=aligned_ts,
                x1=aligned_ts,
                y0=price_min,
                y1=price_max,
                xref="x",
                yref="y",
                line=dict(color="rgba(255, 0, 0, 0.8)", width=1, dash="dash"),
                layer="above",
            )
            fig.add_annotation(
                x=aligned_ts,
                y=price_min,
                xref="x",
                yref="y",
                text=f"Bottom {i+1}",
                showarrow=False,
                yshift=-10,
                font=dict(color="rgba(255, 0, 0, 1.0)", size=11),
            )

    # Update layout for TradingView-like appearance
    fig.update_layout(
        title={
            "text": "Bitcoin (BTC-USD) - TradingView Style Chart",
            "x": 0.5,
            "xanchor": "center",
        },
        template="plotly_dark",
        height=800,
        xaxis_rangeslider_visible=False,
        hovermode="x unified",
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1,
        ),
    )

    # Update x-axis for main chart
    fig.update_xaxes(title_text="Date", row=2, col=1)

    # Update y-axis labels
    fig.update_yaxes(title_text="Price (USD)", row=1, col=1)
    fig.update_yaxes(title_text="Stochastic %", range=[0, 100], row=2, col=1)

    return fig


def create_dash_app():
    """Create and configure the Dash application."""
    app = dash.Dash(__name__, external_stylesheets=[dbc.themes.DARKLY])
    app.title = "Bitcoin Trading Chart"

    # Add custom CSS for date picker styling
    app.index_string = """
    <!DOCTYPE html>
    <html>
        <head>
            {%metas%}
            <title>{%title%}</title>
            {%favicon%}
            {%css%}
            <style>
                .DateInput_input {
                    background-color: #2c3e50 !important;
                    color: #fff !important;
                    border: 1px solid #34495e !important;
                }
                .DateInput_input:focus {
                    background-color: #34495e !important;
                    border-color: #3498db !important;
                }
                .DateRangePickerInput {
                    background-color: #2c3e50 !important;
                }
                .SingleDatePickerInput {
                    background-color: #2c3e50 !important;
                }
                /* Dropdown styling for better visibility */
                .Select-control {
                    background-color: #2c3e50 !important;
                    border-color: #34495e !important;
                    color: #fff !important;
                }
                .Select-value-label {
                    color: #fff !important;
                }
                .Select-input {
                    color: #fff !important;
                }
                .Select-placeholder {
                    color: #95a5a6 !important;
                }
                .Select-menu-outer {
                    background-color: #2c3e50 !important;
                    border-color: #34495e !important;
                }
                .Select-option {
                    background-color: #2c3e50 !important;
                    color: #fff !important;
                }
                .Select-option.is-focused {
                    background-color: #34495e !important;
                    color: #fff !important;
                }
                .Select-option.is-selected {
                    background-color: #3498db !important;
                    color: #fff !important;
                }
                /* Quick date range button styling */
                .btn-outline-secondary {
                    color: #fff !important;
                    border-color: #6c757d !important;
                    background-color: transparent !important;
                }
                .btn-outline-secondary:hover {
                    color: #fff !important;
                    background-color: #495057 !important;
                    border-color: #6c757d !important;
                }
                .btn-outline-secondary.active,
                .btn-outline-secondary:active,
                .preset-btn.active {
                    color: #fff !important;
                    background-color: #3498db !important;
                    border-color: #3498db !important;
                }
                .btn-group .btn {
                    color: #fff !important;
                }
                .preset-btn {
                    color: #fff !important;
                    font-weight: 500 !important;
                }
            </style>
        </head>
        <body>
            {%app_entry%}
            <footer>
                {%config%}
                {%scripts%}
                {%renderer%}
            </footer>
        </body>
    </html>
    """

    # Calculate default date range (10 years ago to today)
    default_end = datetime.now().date()
    default_start = (datetime.now() - timedelta(days=3650)).date()

    app.layout = dbc.Container(
        [
            dbc.Row(
                [
                    dbc.Col(
                        [
                            html.H1(
                                "Bitcoin Trading Chart",
                                className="text-center mb-4",
                                style={"color": "#fff"},
                            ),
                        ],
                        width=12,
                    ),
                ],
                className="mb-4",
            ),
            dbc.Row(
                [
                    dbc.Col(
                        [
                            dbc.Label(
                                "Timeframe:",
                                style={"color": "#fff", "fontWeight": "bold"},
                            ),
                            dcc.Dropdown(
                                id="timeframe-dropdown",
                                options=[
                                    {"label": "4 Hours", "value": "4h"},
                                    {"label": "1 Day", "value": "1d"},
                                    {"label": "1 Week", "value": "1w"},
                                    {"label": "1 Month", "value": "1m"},
                                ],
                                value="1m",
                                clearable=False,
                                style={
                                    "backgroundColor": "#2c3e50",
                                    "color": "#fff",
                                },
                                className="timeframe-dropdown",
                            ),
                        ],
                        md=3,
                        className="mb-3",
                    ),
                    dbc.Col(
                        [
                            dbc.Label(
                                "Start Date:",
                                style={"color": "#fff", "fontWeight": "bold"},
                            ),
                            dcc.DatePickerSingle(
                                id="start-date-picker",
                                date=default_start,
                                display_format="YYYY-MM-DD",
                                style={"width": "100%"},
                            ),
                        ],
                        md=3,
                        className="mb-3",
                    ),
                    dbc.Col(
                        [
                            dbc.Label(
                                "End Date:",
                                style={"color": "#fff", "fontWeight": "bold"},
                            ),
                            dcc.DatePickerSingle(
                                id="end-date-picker",
                                date=default_end,
                                display_format="YYYY-MM-DD",
                                style={"width": "100%"},
                            ),
                        ],
                        md=3,
                        className="mb-3",
                    ),
                    dbc.Col(
                        [
                            dbc.Label(" ", style={"color": "#fff"}),
                            html.Div(
                                [
                                    dbc.Button(
                                        "Update Chart",
                                        id="update-button",
                                        color="primary",
                                        className="w-100",
                                    ),
                                ]
                            ),
                        ],
                        md=3,
                        className="mb-3",
                    ),
                ],
                className="mb-4",
            ),
            dbc.Row(
                [
                    dbc.Col(
                        [
                            dbc.Label(
                                "Quick Date Range:",
                                style={"color": "#fff", "fontWeight": "bold"},
                            ),
                            html.Div(
                                [
                                    dcc.Store(id="active-preset-store", data="10y"),
                                    dbc.ButtonGroup(
                                        [
                                            dbc.Button(
                                                "1D",
                                                id="preset-1d",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                            dbc.Button(
                                                "1W",
                                                id="preset-1w",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                            dbc.Button(
                                                "1M",
                                                id="preset-1m",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                            dbc.Button(
                                                "3M",
                                                id="preset-3m",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                            dbc.Button(
                                                "6M",
                                                id="preset-6m",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                            dbc.Button(
                                                "YTD",
                                                id="preset-ytd",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                            dbc.Button(
                                                "1Y",
                                                id="preset-1y",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                            dbc.Button(
                                                "2Y",
                                                id="preset-2y",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                            dbc.Button(
                                                "5Y",
                                                id="preset-5y",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                            dbc.Button(
                                                "10Y",
                                                id="preset-10y",
                                                color="secondary",
                                                outline=True,
                                                size="sm",
                                                className="preset-btn",
                                            ),
                                        ],
                                        className="w-100",
                                    ),
                                ]
                            ),
                        ],
                        md=12,
                        className="mb-3",
                    ),
                ],
                className="mb-4",
            ),
            dbc.Row(
                [
                    dbc.Col(
                        [
                            dcc.Loading(
                                id="loading",
                                type="default",
                                children=[
                                    dcc.Graph(
                                        id="bitcoin-chart", style={"height": "800px"}
                                    ),
                                ],
                            ),
                        ],
                        width=12,
                    ),
                ],
            ),
            dbc.Row(
                [
                    dbc.Col(
                        [
                            html.Div(id="error-message", className="text-danger mt-3"),
                        ],
                        width=12,
                    ),
                ],
            ),
        ],
        fluid=True,
        style={"backgroundColor": "#1e1e1e", "minHeight": "100vh", "padding": "20px"},
    )

    @app.callback(
        Output("bitcoin-chart", "figure"),
        Output("error-message", "children"),
        [
            Input("update-button", "n_clicks"),
            Input("start-date-picker", "date"),
            Input("end-date-picker", "date"),
        ],
        State("timeframe-dropdown", "value"),
        prevent_initial_call=False,
    )
    def update_chart(n_clicks, start_date, end_date, timeframe):
        """Update the chart based on user selections."""
        error_message = ""

        try:
            # Convert dates to string format
            start_str = (
                datetime.fromisoformat(start_date).strftime("%Y-%m-%d")
                if start_date
                else None
            )
            end_str = (
                datetime.fromisoformat(end_date).strftime("%Y-%m-%d")
                if end_date
                else None
            )

            # Validate date range
            if start_str and end_str:
                start_dt = datetime.fromisoformat(start_date)
                end_dt = datetime.fromisoformat(end_date)
                if start_dt >= end_dt:
                    error_message = "Start date must be before end date."
                    # Return empty figure with error
                    fig = go.Figure()
                    fig.update_layout(
                        template="plotly_dark",
                        title="Error: Invalid date range",
                        height=800,
                    )
                    return fig, error_message

            # Fetch data
            df = fetch_bitcoin_data(
                interval=timeframe, start_date=start_str, end_date=end_str
            )

            if df.empty:
                error_message = "No data available for the selected date range."
                fig = go.Figure()
                fig.update_layout(
                    template="plotly_dark",
                    title="Error: No data available",
                    height=800,
                )
                return fig, error_message

            # Calculate indicators
            df = calculate_indicators(df)

            # Create chart
            fig = create_tradingview_chart(df)

            return fig, error_message

        except Exception as e:
            error_message = f"Error loading data: {str(e)}"
            fig = go.Figure()
            fig.update_layout(
                template="plotly_dark",
                title="Error loading chart",
                height=800,
            )
            return fig, error_message

    @app.callback(
        [
            Output("start-date-picker", "date"),
            Output("end-date-picker", "date"),
            Output("active-preset-store", "data"),
        ],
        [
            Input("preset-1d", "n_clicks"),
            Input("preset-1w", "n_clicks"),
            Input("preset-1m", "n_clicks"),
            Input("preset-3m", "n_clicks"),
            Input("preset-6m", "n_clicks"),
            Input("preset-ytd", "n_clicks"),
            Input("preset-1y", "n_clicks"),
            Input("preset-2y", "n_clicks"),
            Input("preset-5y", "n_clicks"),
            Input("preset-10y", "n_clicks"),
        ],
        prevent_initial_call=True,
    )
    def update_date_range_from_preset(
        preset_1d,
        preset_1w,
        preset_1m,
        preset_3m,
        preset_6m,
        preset_ytd,
        preset_1y,
        preset_2y,
        preset_5y,
        preset_10y,
    ):
        """Update date range based on preset button clicks."""
        ctx = dash.callback_context
        if not ctx.triggered:
            raise PreventUpdate

        button_id = ctx.triggered[0]["prop_id"].split(".")[0]
        now = datetime.now()
        end_date = now.date()

        # Extract preset name from button_id (e.g., "preset-ytd" -> "ytd")
        active_preset = button_id.replace("preset-", "")

        if button_id == "preset-1d":
            start_date = (now - timedelta(days=1)).date()
        elif button_id == "preset-1w":
            start_date = (now - timedelta(days=7)).date()
        elif button_id == "preset-1m":
            start_date = (now - timedelta(days=30)).date()
        elif button_id == "preset-3m":
            start_date = (now - timedelta(days=90)).date()
        elif button_id == "preset-6m":
            start_date = (now - timedelta(days=180)).date()
        elif button_id == "preset-ytd":
            # Year to date: January 1st of current year
            start_date = datetime(now.year, 1, 1).date()
        elif button_id == "preset-1y":
            start_date = (now - timedelta(days=365)).date()
        elif button_id == "preset-2y":
            start_date = (now - timedelta(days=730)).date()
        elif button_id == "preset-5y":
            start_date = (now - timedelta(days=1825)).date()
        elif button_id == "preset-10y":
            start_date = (now - timedelta(days=3650)).date()
        else:
            raise PreventUpdate

        # Return updated dates and active preset (chart will auto-update via date picker inputs)
        return start_date, end_date, active_preset

    @app.callback(
        [
            Output("preset-1d", "className"),
            Output("preset-1w", "className"),
            Output("preset-1m", "className"),
            Output("preset-3m", "className"),
            Output("preset-6m", "className"),
            Output("preset-ytd", "className"),
            Output("preset-1y", "className"),
            Output("preset-2y", "className"),
            Output("preset-5y", "className"),
            Output("preset-10y", "className"),
        ],
        Input("active-preset-store", "data"),
        prevent_initial_call=False,
    )
    def update_active_button_state(active_preset):
        """Update button active states based on active preset."""
        base_class = "preset-btn"
        active_class = f"{base_class} active"

        # Default to "10y" if active_preset is None (initial load)
        if active_preset is None:
            active_preset = "10y"

        return [
            active_class if active_preset == "1d" else base_class,
            active_class if active_preset == "1w" else base_class,
            active_class if active_preset == "1m" else base_class,
            active_class if active_preset == "3m" else base_class,
            active_class if active_preset == "6m" else base_class,
            active_class if active_preset == "ytd" else base_class,
            active_class if active_preset == "1y" else base_class,
            active_class if active_preset == "2y" else base_class,
            active_class if active_preset == "5y" else base_class,
            active_class if active_preset == "10y" else base_class,
        ]

    return app


def main():
    """Main function to run the Dash application."""
    app = create_dash_app()
    print("Starting Bitcoin Trading Chart application...")
    print("Open your browser to http://127.0.0.1:8050")
    app.run(debug=True, host="127.0.0.1", port=8050)


if __name__ == "__main__":
    main()
