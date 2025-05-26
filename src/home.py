import streamlit as st
from src.utils import *

def display_home(session):
    """
    Displays the home page of the Snowflake AI Toolkit application.
    
    This function creates a visually appealing landing page with information about
    the Snowflake AI Toolkit, including its description and a section of quick link
    buttons styled like ChatGPT's welcome screen tiles. It includes styled sections for:
    - Header with application title
    - Toolkit description
    - Quick links section with interactive buttons
    - Call to action button
    
    Args:
        session: Snowflake session object used for database operations
        
    The function uses custom CSS styling to create a cohesive Snowflake-themed design
    with responsive sections and interactive elements inspired by ChatGPT's tile design.
    """
    # Apply custom CSS styles for a Snowflake blue-themed layout and ChatGPT-like tiles
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
            .quick-links-container {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                justify-content: center;
                margin-top: 20px;
            }
            .quick-link-btn {
                background-color: #F7FAFC;
                color: #333;
                border: 1px solid #E2E8F0;
                padding: 15px 20px;
                font-size: 1.1em;
                border-radius: 28px;
                text-decoration: none;
                text-align: center;
                flex: 1;
                min-width: 200px;
                max-width: 250px;
                transition: background-color 0.2s ease;
            }
            .quick-link-btn:hover {
                background-color: #E2E8F0;
                border-color: #56CCF2;
            }
            .get-started-btn {
                background-color: #56CCF2;
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 1.2em;
                border-radius: ;
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
            <div class="header-title">Snowflake AI Toolkit: Your Playground for AI Innovation</div>
            <div class="header-subtitle">Discover, prototype, and build AI solutions with Snowflake Cortex in a no-code environment.</div>
        </div>
    """, unsafe_allow_html=True)

       # Toolkit Description
    st.markdown("""
        <div class="section">
            <div class="section-title">About Snowflake AI Toolkit</div>
            <div class="section-content">
                Snowflake AI Toolkit is an AI Accelerator and Playground for enabling AI in Snowflake. It is a Plug and Play Streamlit-based Native App that can be used to explore, learn, and build rapid prototypes of AI Solutions in Snowflake powered by Snowflake's Cortex and AI Functions.
            </div>
        </div>
    """, unsafe_allow_html=True)

    # Resources Section (GitHub & Medium Links)
    st.markdown("""
        <div class="section">
            <div class="section-title">Resources</div>
            <div class="section-content">
                <ul>
                    <li><a href="https://github.com/Snowflake-Labs/Snowflake-AI-Toolkit" target="_blank">GitHub Repository</a></li>
                    <li><a href="https://medium.com/snowflake/build-rapid-ai-prototypes-and-validates-use-cases-against-snowflake-cortex-with-the-snowflake-ai-ae811892cb92" target="_blank">Medium Article</a></li>
                </ul>
            </div>
        </div>
    """, unsafe_allow_html=True)

