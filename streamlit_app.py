import streamlit as st
from src.utils import *
from src import home, playground, build, notification, setup
from snowflake.snowpark.context import get_active_session
from pathlib import Path
import json
from snowflake.snowpark.exceptions import SnowparkSQLException
from src.notification import *
from src.search import *
from src.cortex_agent import *
# from trulens.connectors.snowflake import SnowflakeConnector
# from trulens.core.session import TruSession
# from trulens.dashboard import run_dashboard

# Load the config file
config_path = Path("src/settings_config.json")
with open(config_path, "r") as f:
    config = json.load(f)

# Set the page title and layout
st.set_page_config(page_title="Snowflake AI Toolkit", layout="wide")

# Ensure session state variables are initialized
if 'page' not in st.session_state:
    st.session_state.page = "Home"  # Default page

if 'snowflake_session' not in st.session_state:
    st.session_state.snowflake_session = None

# Establish the session if not already initialized
if st.session_state.snowflake_session is None:
    if config["mode"] == "native":
        try:
            st.session_state.snowflake_session = get_active_session()
        except Exception as e:
            st.error(f"Failed to get active session in native mode: {e}")
    elif config["mode"] == "debug":
        try:
            connection_parameters = {
                "account": config["account"],"user": config["user"],"password": config["password"],
                "role": config["role"],"warehouse": config["warehouse"],"database": config["database"],
                "schema": config["schema"],
                # "init_server_side": True
            }
            # connector = SnowflakeConnector(**connection_parameters)
            # truelens_session = TruSession(connector)
            # st.session_state.truelens_session = truelens_session
            # run_dashboard(truelens_session)
            st.session_state.snowflake_session = Session.builder.configs(connection_parameters).create()
        except Exception as e:
            st.error(f"Failed to create session in debug mode: {e}")

# Check if session is successfully created
if st.session_state.snowflake_session is None:
    st.error("Failed to connect to Snowflake.")
else:
    try:
        create_database_and_stage_if_not_exists(st.session_state.snowflake_session)
    except Exception as e:
        st.error(f"Error while creating database and stage: {e}")



# Set up UDF at app start
setup_pdf_text_chunker(st.session_state.snowflake_session)


# Load custom CSS for sidebar styling
st.markdown("""
    <style>
            
    /* Sidebar Background */
    .css-18e3c8v {
        background-color: #333;
        padding: 20px;
        color: white;
    }

    /* Sidebar Sections */
    .sidebar-section {
        background-color: #444;
        border-radius: 8px;
        padding: 15px;
        color: white;
        border: 1px solid #555;
        width: 100%; /* Ensures uniform width */
        text-align: center;
    }
            
        [data-testid="stSidebar"] button { 
            width: 100%;    
            justify-content: center;
            text-align: center;
            item-align: center;
            cursor: pointer;
            border-radius: 8px;
            padding: 10px;
        } 
            
    </style>
""", unsafe_allow_html=True)


# Sidebar Navigation with logo
render_image(config["default_settings"]["logo_path"])

# Sidebar content with expanders and buttons under each category
with st.sidebar:
    st.title("📋 Menu")

    # Overview Section
    with st.expander("🔍 **Overview**", expanded=False):
        if st.button("📄 About"):
            st.session_state.page = "Home"
        if st.button("⚙️ Setup"):
            st.session_state.page = "Setup"

    # Components Section
    with st.expander("✨ **Components**", expanded=False):
        if st.button("🎮 Playground"):
            st.session_state.page = "Playground"
        if st.button("🔧 Build"):
            st.session_state.page = "Build"
        if st.button("🔍 Cortex Search"):
            st.session_state.page = "Cortex Search"
        if st.button("🤖 Cortex Agent"):
            st.session_state.page = "Cortex Agent"
        if st.button("🔔 Notification"):
            st.session_state.page = "Notification"

# Pages dictionary with corresponding display functions
pages = {
    "Home": home.display_home,
    "Playground": playground.display_playground,
    "Build": build.display_build,
    "Notification": notification.display_notification,
    "Cortex Search": display_search,
    "Cortex Agent": display_cortex_agent,
    "Setup": setup.display_setup
}

# Render the selected page from the pages dictionary
if st.session_state.page in pages:
    try:
        pages[st.session_state.page](st.session_state.snowflake_session)
    except Exception as e:
        st.error(f"Error loading {st.session_state.page} page: {e}")
