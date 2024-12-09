import streamlit as st

def display_setup(session):
    # Apply custom CSS styles for consistency with home.py
    st.markdown("""
        <style>
            .header-section {
                background-color: #56CCF2;
                padding: 30px;
                text-align: center;
                border-radius: 10px;
                color: white;
                font-family: 'Arial', sans-serif;
            }
            .header-title {
                font-size: 3em;
                font-weight: bold;
            }
            .header-subtitle {
                font-size: 1.2em;
                margin-top: 10px;
            }
            .section {
                background-color: white;
                padding: 20px;
                border-radius: 10px;
                margin-top: 20px;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            }
            .section-title {
                font-size: 1.8em;
                font-weight: bold;
                color: #56CCF2;
                margin-bottom: 10px;
            }
            .section-content {
                font-size: 1.1em;
                line-height: 1.5;
                color: #333;
            }
            .get-started-btn {
                background-color: #56CCF2;
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 1.2em;
                border-radius: 5px;
                margin-top: 20px;
                display: inline-block;
                text-decoration: none;
            }
            .get-started-btn:hover {
                background-color: #2D9CDB;
            }
        </style>
    """, unsafe_allow_html=True)

    # Header Section
    st.markdown("""
        <div class="header-section">
            <div class="header-title">Setup Guide: Snowflake AI Toolkit</div>
            <div class="header-subtitle">Snowflake AI Toolkit is an AI Accelerator and Playground for enabling AI in Snowflake.</div>
        </div>
    """, unsafe_allow_html=True)

    # Prerequisites Section
    st.markdown("""
        <div class="section">
            <div class="section-title">1. Prerequisites</div>
            <div class="section-content">
                Before setting up the app, make sure you have:
                <ul>
                    <li><strong>Snowflake account</strong> with Cortex functionalities enabled.</li>
                    <li><strong>ACCOUNTADMIN</strong> or equivalent role for creating stages, databases, and other resources.</li>
                    <li><strong>Streamlit</strong> installed on your local machine or server.</li>
                    <li><strong>Python 3.7+</strong> installed.</li>
                </ul>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Native Streamlit Emphasis Section
    st.markdown("""
        <div class="section">
            <div class="section-title">2. Native Mode Setup (Recommended)</div>
            <div class="section-content">
                The app is designed to be run in <strong>Native Streamlit mode</strong>. This mode ensures that your app runs 
                within Snowflake’s managed environment, offering better integration and performance.
                <ul>
                    <li><strong>Native Streamlit Mode</strong>: The app will use the active Snowflake session, so no local configuration for credentials is required.</li>
                    <li>Ensure that your Snowflake account supports running Streamlit apps natively.</li>
                </ul>
                To run the app in native mode, follow these steps:
                <ol>
                    <li>Upload the app to your Snowflake environment.</li>
                    <li>Set <code>"mode": "native"</code> in the <code>src/settings_config.json</code> configuration file.</li>
                    <li>Use the following command to launch the app in native mode within Snowflake:</li>
                </ol>
                <pre><code>streamlit run streamlit_app.py --run_native</code></pre>
                When running in native mode, the Snowflake connection is handled automatically.
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Debug Mode Section
    st.markdown("""
        <div class="section">
            <div class="section-title">3. Debug Mode Setup (Optional)</div>
            <div class="section-content">
                You can also run the app in <strong>Debug Mode</strong> if you want to test the app locally on your machine. This mode requires you to 
                configure Snowflake credentials manually.
                <ol>
                    <li>Open the <code>src/settings_config.json</code> file and update it with your Snowflake credentials:</li>
                </ol>
                <pre><code>
{
  "snowflake": {
    "account": "your-account-url",
    "user": "your-username",
    "password": "your-password",
    "role": "your-role",
    "warehouse": "your-warehouse",
    "database": "your-database",
    "schema": "your-schema"
  },
  "mode": "debug"
}
                </code></pre>
                <ol start="2">
                    <li>After configuring the credentials, run the app in debug mode with:</li>
                </ol>
                <pre><code>streamlit run streamlit_app.py --debug</code></pre>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Cloning the Repository Section
    st.markdown("""
        <div class="section">
            <div class="section-title">4. Clone the Repository</div>
            <div class="section-content">
                Clone the repository that contains the Snowflake Cortex demo app code:
                <pre><code>git clone https://github.com/sgsshankar/Snowflake-AI-Toolkit.git</code></pre>
                Then navigate into the cloned directory:
                <pre><code>cd snowflake-ai-toolkit</code></pre>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Install Dependencies Section
    st.markdown("""
        <div class="section">
            <div class="section-title">5. Install Python Dependencies</div>
            <div class="section-content">
                The app requires several Python libraries, including <strong>snowflake-snowpark-python</strong>, <strong>Streamlit</strong>, and others.
                <pre><code>pip install -r requirements.txt</code></pre>
                Ensure <strong>pandas</strong> and <strong>pyarrow</strong> are also installed, as they are needed for various Snowflake operations.
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Create Database and Stage (Auto-handled) Section
    st.markdown("""
        <div class="section">
            <div class="section-title">6. Create Database and Stage (Auto-handled)</div>
            <div class="section-content">
                Upon launching the app, it will automatically create the necessary database and stage in your Snowflake account, 
                provided the user has the required permissions.
                Ensure that your Snowflake role has privileges to create databases and stages.
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Running the App Section
    st.markdown("""
        <div class="section">
            <div class="section-title">7. Running the App</div>
            <div class="section-content">
                Once everything is set up, launch the app using Streamlit:
                <pre><code>streamlit run streamlit_app.py</code></pre>
                This will start the app in your default browser. Use the sidebar to navigate between various components, including 
                <strong>Playground</strong>, <strong>Build</strong>, and <strong>Notifications</strong>.
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Troubleshooting and Caveats Section
    st.markdown("""
        <div class="section">
            <div class="section-title">8. Troubleshooting & Caveats</div>
            <div class="section-content">
                <ul>
                    <li>If you encounter Snowflake permission errors, check your role privileges to ensure you can create databases and stages.</li>
                    <li>If <strong>pandas</strong> or <strong>pyarrow</strong> dependencies fail, try reinstalling them using <code>pip install pandas pyarrow</code>.</li>
                    <li>Ensure your Snowflake account supports the necessary Cortex functionalities.</li>
                </ul>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Support Section
    st.markdown("""
        <div class="section">
            <div class="section-title">9. Support</div>
            <div class="section-content">
                For further assistance, please reach out to the project maintainers through GitHub or other communication channels.
            </div>
        </div>
    """, unsafe_allow_html=True)
