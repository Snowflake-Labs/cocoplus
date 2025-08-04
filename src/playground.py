import streamlit as st
import json
from src.cortex_functions import *
from snowflake.snowpark.exceptions import SnowparkSQLException
from src.query_result_builder import *
from snowflake.core import Root
from src.utils import *
from pathlib import Path
from src.cortex_agent import *

# Load the config file
config_path = Path("src/settings_config.json")
with open(config_path, "r") as f:
    config = json.load(f)

# Conditionally import streamlit_mic_recorder only in debug mode
if config.get("mode") == "debug":
    from streamlit_mic_recorder import speech_to_text

def execute_functionality(session, functionality, input_data, settings):
    """
    Executes the selected functionality in playground mode.
    """
    if functionality == "Complete":
        result_json = get_complete_result(
            session, settings['model'], input_data['prompt'],
            settings['temperature'], settings['max_tokens'], settings['guardrails'], settings['system_prompt']
        )
        result_formatted = format_result(result_json)
        st.write("Completion Result")
        st.write(f"**Messages:**")
        st.success(result_formatted['messages'])
    
    elif functionality == "Complete Multimodal":
        result = get_complete_multimodal_result(
            session, settings['model'], input_data['prompt'], settings["stage"], settings["files"],
        )
        # st.write("Completion Multimodal Result")
        if len(settings["files"]) == 1:
            path = f"@{settings['stage']}/{settings['files'][0]}"
            image = session.file.get_stream(path, decompress=False).read()
            st.image(image)
        st.write(result)

    elif functionality == "Translate":
        result = get_translation(session,input_data['text'], settings['source_lang'], settings['target_lang'])
        st.write(f"**Translated Text:** {result}")

    elif functionality == "Summarize":
        result = get_summary(session,input_data['text'])
        st.write(f"**Summary:** {result}")

    elif functionality == "Extract":
        result = get_extraction(session,input_data['text'], input_data['query'])
        st.write(f"**Extracted Answer:** {result}")

    elif functionality == "Sentiment":
        if input_data["toggle"]:
            result = get_entity_sentiment(session,input_data['text'], input_data['entities'])
            st.write(f"**Entity Sentiment Analysis Result:** {result}")
        else:
            result = get_sentiment(session,input_data['text'])
            st.write(f"**Sentiment Analysis Result:** {result}")
    elif functionality == "Classify Text":
        result = get_classification(session,input_data['text'], input_data['categories'])
        st.write(f"**Classification Result:** {result}")
    elif functionality == "Parse Document":
        result = get_parse_document(session, settings["stage"], settings["file"], input_data["mode"])
        st.write(f"**Parsed Document Result:**")
        # print(result)
        res = json.loads(result)
        st.write(res["content"])

    elif functionality == "AI Similarity":
        try:
            # Build config object
            config_object = {}
            if settings.get('model'):
                config_object['model'] = settings['model']

            # Execute AI_SIMILARITY
            result = get_ai_similarity_result(
                session,
                settings['input1'] if settings['input_type'] == "Text" else None,
                settings['input2'] if settings['input_type'] == "Text" else None,
                config_object,
                settings['input_type'],
                settings.get('stage'),
                settings.get('file1'),
                settings.get('file2')
            )

            # Display results
            st.write("**Similarity Score:**")
            st.write(f"{result:.4f} (Range: -1 to 1)")
        except ValueError as e:
            st.error(f"Input Error: {e}")
        except SnowparkSQLException as e:
            st.error(f"SQL Error executing AI_SIMILARITY: {e}")
            st.write("Check the console for the generated SQL query.")
        except Exception as e:
            st.error(f"Unexpected Error: {e}")

    elif functionality == "AI Classify":
        try:
            config_object = {}
            if settings.get('task_description'):
                config_object['task_description'] = settings['task_description']
            if settings.get('output_mode'):
                config_object['output_mode'] = settings['output_mode']
            if settings.get('examples'):
                config_object['examples'] = settings['examples']

            if settings['input_type'] == "Image":
                input_data_for_query = {"prompt": settings.get('prompt', '')}
                result = get_ai_classify_result(
                    session,
                    input_data_for_query,
                    settings['categories'],
                    config_object,
                    input_type=settings['input_type'],
                    stage=settings.get('stage'),
                    file_name=settings.get('file')
                )
                if settings.get('file'):
                    path = f"{settings['stage']}/{settings['file']}"
                    image = session.file.get_stream(path, decompress=False).read()
                    st.image(image)
            else:
                input_data_for_query = settings.get('text', '')
                result = get_ai_classify_result(
                    session,
                    input_data_for_query,
                    settings['categories'],
                    config_object,
                    input_type=settings['input_type']
                )

            # Display results
            st.write("**Classification Result:**")
            try:
                result_json = json.loads(result)
                st.json(result_json)
            except json.JSONDecodeError:
                st.write(result)
        except ValueError as e:
            st.error(f"Input Error: {e}")
        except SnowparkSQLException as e:
            st.error(f"SQL Error executing AI_CLASSIFY: {e}")
            st.write("Check the console for the generated SQL query.")
        except Exception as e:
            st.error(f"Unexpected Error: {e}")

    elif functionality == "AI Filter":
        try:
            # Build config object
            config_object = {}
            if settings.get('task_description'):
                config_object['task_description'] = settings['task_description']
            if settings.get('output_mode'):
                config_object['output_mode'] = settings['output_mode']
            if settings.get('examples'):
                config_object['examples'] = settings['examples']

            if settings['input_type'] == "Image":
                if not settings.get('predicate'):
                    raise ValueError("Prompt is required for image input.")
                input_data_for_query = settings.get('predicate', '')
                result = get_ai_filter_result(
                    session,
                    input_data_for_query,
                    settings['stage'],
                    settings['file']
                )
                # Display the image
                path = f"{settings['stage']}/{settings['file']}"
                image = session.file.get_stream(path, decompress=False).read()
                st.image(image)
            else:
                input_data_for_query = settings.get('text', '')
                result = get_ai_filter_result(
                    session,
                    input_data_for_query
                )

            # Display results
            st.write("**Filter Result:**")
            try:
                result_json = json.loads(result)
                st.json(result_json)
            except json.JSONDecodeError:
                st.write(result)
        except ValueError as e:
            st.error(f"Input Error: {e}")
        except SnowparkSQLException as e:
            st.error(f"SQL Error executing AI_FILTER: {e}")
            st.write("Check the console for the generated SQL query.")
        except Exception as e:
            st.error(f"Unexpected Error: {e}")
    
    elif functionality == "AI AGG":
        try:
            if settings['input_type'] == "Text":
                # Execute AI_AGG on text input
                query = f"""
                    SELECT AI_AGG('{settings['text_input'].replace("'", "''")}', '{settings['task_description'].replace("'", "''")}')
                """
                result = session.sql(query).collect()
                st.write("**Aggregation Result:**")
                st.write(result[0][0])

            else:  # Table input
                table_name = f"{settings['db']}.{settings['schema']}.{settings['table']}"
                text_column = settings['text_column']
                task_description = settings['task_description'].replace("'", "''")

                if settings.get('group_by_column'):
                    # Grouped aggregation
                    group_by_column = settings['group_by_column']
                    query = f"""
                        SELECT {group_by_column},
                               AI_AGG({text_column}, '{task_description}') AS summarized_result
                        FROM {table_name}
                        GROUP BY {group_by_column}
                    """
                    result = session.sql(query).collect()
                    st.write("**Grouped Aggregation Results:**")
                    st.dataframe(result)
                else:
                    # Simple aggregation
                    query = f"""
                        SELECT AI_AGG({text_column}, '{task_description}') AS summarized_result
                        FROM {table_name}
                    """
                    result = session.sql(query).collect()
                    st.write("**Aggregation Result:**")
                    st.write(result[0][0])

        except SnowparkSQLException as e:
            st.error(f"SQL Error executing AI_AGG: {e}")
            st.write("Check the console for the generated SQL query.")
        except Exception as e:
            st.error(f"Unexpected Error: {e}")

    elif functionality == "AI SUMMARIZE AGG":
        try:
            if settings['input_type'] == "Text":
                # Execute AI_SUMMARIZE_AGG on text input
                query = f"""
                    SELECT AI_SUMMARIZE_AGG('{settings['text_input'].replace("'", "''")}')
                """
                result = session.sql(query).collect()
                st.write("**Summary Result:**")
                st.write(result[0][0])

            else:  # Table input
                table_name = f"{settings['db']}.{settings['schema']}.{settings['table']}"
                text_column = settings['text_column']

                if settings.get('group_by_column'):
                    # Grouped summary
                    group_by_column = settings['group_by_column']
                    query = f"""
                        SELECT {group_by_column},
                               AI_SUMMARIZE_AGG({text_column}) AS summarized_result
                        FROM {table_name}
                        GROUP BY {group_by_column}
                    """
                    result = session.sql(query).collect()
                    st.write("**Grouped Summary Results:**")
                    st.dataframe(result)
                else:
                    # Simple summary
                    query = f"""
                        SELECT AI_SUMMARIZE_AGG({text_column}) AS summarized_result
                        FROM {table_name}
                    """
                    result = session.sql(query).collect()
                    st.write("**Summary Result:**")
                    st.write(result[0][0])

        except SnowparkSQLException as e:
            st.error(f"SQL Error executing AI_SUMMARIZE_AGG: {e}")
            st.write("Check the console for the generated SQL query.")
        except Exception as e:
            st.error(f"Unexpected Error: {e}")

    elif functionality == "AI Complete":
        try:
            # Build model parameters
            model_parameters = {}
            if settings.get('temperature'):
                model_parameters['temperature'] = settings['temperature']
            if settings.get('top_p'):
                model_parameters['top_p'] = settings['top_p']
            if settings.get('max_tokens'):
                model_parameters['max_tokens'] = settings['max_tokens']
            if settings.get('guardrails'):
                model_parameters['guardrails'] = settings['guardrails']

            if settings['input_type'] == "Text":
                escaped_prompt = settings['prompt'].replace("'", "''")
                query_parts = [
                    "SELECT AI_COMPLETE(",
                    f"'{settings['model']}',",
                    f"'{escaped_prompt}'"
                ]

                if model_parameters:
                    query_parts.append(f", PARSE_JSON('{json.dumps(model_parameters)}')")
                else:
                    query_parts.append(", NULL")

                if settings.get('response_format'):
                    query_parts.append(f", PARSE_JSON('{json.dumps(settings['response_format'])}')")
                else:
                    query_parts.append(", NULL")

                if settings.get('show_details') is not None:
                    query_parts.append(f", {str(settings['show_details']).upper()}")  # TRUE / FALSE
                else:
                    query_parts.append(", FALSE")

                query = "".join(query_parts) + ")"
                result = session.sql(query).collect()[0][0]

                # Display results
                st.write("**Completion Result:**")
                if settings.get('show_details') or settings.get('response_format'):
                    try:
                        st.json(json.loads(result))
                    except json.JSONDecodeError:
                        st.write(result)
                else:
                    result = result.replace('"', '')
                    st.write(result)

            elif settings['input_type'] == "Image":
                # AI_COMPLETE with single image
                query = f"""
                    SELECT AI_COMPLETE(
                        '{settings['model']}',
                        '{settings['predicate'].replace("'", "''")}',
                        TO_FILE('{settings['stage']}', '{settings['file']}'),
                        '{json.dumps(model_parameters)}'::VARIANT
                    )
                """
                result = session.sql(query).collect()[0][0]

                # Display image and result
                st.write("**Input Image:**")
                path = f"{settings['stage']}/{settings['file']}"
                image = session.file.get_stream(path, decompress=False).read()
                st.image(image)
                st.write("**Completion Result:**")
                try:
                    st.json(json.loads(result))
                except json.JSONDecodeError:
                    st.write(result)

            else:  # Prompt Object
                # AI_COMPLETE with prompt object
                table_name = f"{settings['db']}.{settings['schema']}.{settings['table']}"
                prompt_column = settings['prompt_column']
                file_column = settings.get('file_column')

                if file_column:
                    # Prompt object with images
                    query = f"""
                        SELECT AI_COMPLETE(
                            '{settings['model']}',
                            PROMPT(
                                {prompt_column},
                                TO_FILE('{settings['stage']}', {file_column})
                            ),
                            '{json.dumps(model_parameters)}'::VARIANT
                        ) AS result
                        FROM {table_name}
                    """
                else:
                    # Prompt object with text only
                    query = f"""
                        SELECT AI_COMPLETE(
                            '{settings['model']}',
                            {prompt_column},
                            '{json.dumps(model_parameters)}'::VARIANT
                        ) AS result
                        FROM {table_name}
                    """
                result = session.sql(query).collect()

                # Display results
                st.write("**Completion Results:**")
                st.dataframe([{"result": row['result']} for row in result])

        except SnowparkSQLException as e:
            st.error(f"SQL Error executing AI_COMPLETE: {e}")
            st.write("Check the console for the generated SQL query.")
        except Exception as e:
            st.error(f"Unexpected Error: {e}")

def get_functionality_settings(functionality, config, session=None):
    """
    Returns settings based on the selected functionality from config.
    """
    settings = {}
    defaults = config["default_settings"]

    if functionality == "Complete":
        col1, col2 = st.columns(2)
        with col1: 
            model_type = st.selectbox("Model Type", ["Base", "Fine Tuned", "Private Preview"])
        with col2:
            if model_type == "Base":
                settings['model'] = st.selectbox("Change chatbot model:", defaults['model'])
            elif model_type == "Private Preview":
                settings['model'] = st.selectbox("Change chatbot model:", defaults['private_preview_models'])
            else:
                fine_tuned_models = fetch_fine_tuned_models(session)
                settings['model'] = st.selectbox("Change chatbot model:", fine_tuned_models)        
        settings['temperature'] = st.slider("Temperature:", defaults['temperature_min'], defaults['temperature_max'], defaults['temperature'])
        settings['max_tokens'] = st.slider("Max Tokens:", defaults['max_tokens_min'], defaults['max_tokens_max'], defaults['max_tokens'])
        settings['guardrails'] = st.checkbox("Enable Guardrails", value=defaults['guardrails'])
        if f"system_prompt_{functionality}_data" not in st.session_state:
            st.session_state[f"system_prompt_{functionality}_data"] = ""
        settings['system_prompt'] = st.text_area("System Prompt (optional):", placeholder="Enter a system prompt...", key=f"system_prompt_{functionality}", value=st.session_state[f"system_prompt_{functionality}_data"])

    elif functionality == "Complete Multimodal":
        col1, col2 = st.columns(2)
        with col1: 
            selected_model = st.selectbox("Models", config["default_settings"]["complete_multimodal"])
            settings['model'] = selected_model
        with col2:
            selected_db = st.selectbox("Databases", list_databases(session))
            settings["db"] = selected_db
        with col1:
            selected_schema = st.selectbox("Schemas", list_schemas(session, selected_db))
            settings["schema"] = selected_schema
        with col2:
            selected_stage = st.selectbox("Stage", list_stages(session, selected_db, selected_schema))
            stage = f"{selected_db}.{selected_schema}.{selected_stage}"
            settings["stage"] = stage
        if selected_stage:
            list = list_files_in_stage(session, selected_db, selected_schema, selected_stage)
            list = [file.split("/")[-1] for file in list]
            # add index to the list, starts from 0
            list = [f"{i}: {file}" for i, file in enumerate(list)]
            if not list:
                st.warning("No files found in the selected stage.")
                return
            files = st.multiselect("Images", list)
            # remove indices from the list
            files = [file.split(": ")[-1] for file in files]
            if not files:
                st.warning("No files selected.")
                return
            settings["files"] = files

    elif functionality == "Translate":
        settings['source_lang'] = st.selectbox("Source Language", defaults['languages'])
        settings['target_lang'] = st.selectbox("Target Language", defaults['languages'])

    elif functionality == "Parse Document":
        col1, col2 = st.columns(2)
        with col1:
            selected_db = st.selectbox("Databases", list_databases(session))
            settings["db"] = selected_db
        with col2:
            selected_schema = st.selectbox("Schemas", list_schemas(session, selected_db))
            settings["schema"] = selected_schema
        with col1:
            selected_stage = st.selectbox("Stage", list_stages(session, selected_db, selected_schema))
            stage = f"@{selected_db}.{selected_schema}.{selected_stage}"
            settings["stage"] = stage
        if selected_stage:
            list = list_files_in_stage(session, selected_db, selected_schema, selected_stage)
            list = [file.split("/")[-1] for file in list]
            if not list:
                st.warning("No files found in the selected stage.")
                return
            with col2:
                file = st.selectbox("File", list)
            if not file:
                st.warning("No files selected.")
                return
            settings["file"] = file

    elif functionality == "AI Similarity":
        cols = st.columns(3)
        col1, col2 = st.columns(2)
        with col1:
            input_type = st.selectbox("Input Type", ["Text", "Image"])
            settings['input_type'] = input_type
        with col2:
            if input_type == "Text":
                default_model = 'nv-embed-qa-4'
                model_options = [
                    'snowflake-arctic-embed-l-v2',
                    'nv-embed-qa-4',
                    'multilingual-e5-large',
                    'voyage-multilingual-2',
                    'snowflake-arctic-embed-m-v1.5',
                    'snowflake-arctic-embed-m',
                   'e5-base-v2'
                ]
            else:
                default_model = 'voyage-multimodal-3'
                model_options = ['voyage-multimodal-3']
            settings['model'] = st.selectbox("Embedding Model", model_options, index=model_options.index(default_model))

        if input_type == "Image":
            with cols[0]:
                selected_db = st.selectbox("Databases", list_databases(session))
                settings["db"] = selected_db
            with cols[1]:
                selected_schema = st.selectbox("Schemas", list_schemas(session, selected_db))
                settings["schema"] = selected_schema
            with cols[2]:
                selected_stage = st.selectbox("Stage", list_stages(session, selected_db, selected_schema))
                stage = f"@{selected_db}.{selected_schema}.{selected_stage}"
                settings["stage"] = stage
            if selected_stage:
                file_list = list_files_in_stage(session, selected_db, selected_schema, selected_stage)
                file_list = [file.split("/")[-1] for file in file_list]
                if not file_list:
                    st.warning("No files found in the selected stage.")
                    return
                with col1:
                    settings["file1"] = st.selectbox("First Image File", file_list)
                with col2:
                    settings["file2"] = st.selectbox("Second Image File", file_list)
                if not settings["file1"] or not settings["file2"]:
                    st.warning("Please select two image files.")
                    return
                if settings["file1"] == settings["file2"]:
                    st.warning("Please select two different image files.")
                    return
            st.warning("Ensure the stage is not encrypted with SNOWFLAKE_FULL, AWS_CSE, or AZURE_CSE, and is not a user or table stage.")

        elif input_type == "Text":
            if f"input1_{functionality}_data" not in st.session_state:
                st.session_state[f"input1_{functionality}_data"] = ""
            if f"input2_{functionality}_data" not in st.session_state:
                st.session_state[f"input2_{functionality}_data"] = ""
            
            settings['input1'] =  st.text_area("Enter first text:", placeholder="Type your first text here...", key=f"input1_{functionality}", value=st.session_state[f"input1_{functionality}_data"])
            settings['input2'] =  st.text_area("Enter second text:", placeholder="Type your second text here...", key=f"input2_{functionality}", value=st.session_state[f"input2_{functionality}_data"])
            
    elif functionality == "AI Classify":
        col1, col2 = st.columns(2)
        cols = st.columns(3)
        
        # Get input type from the main interface if available
        if "ai_classify_input_type" in st.session_state:
            input_type = st.session_state["ai_classify_input_type"]
        else:
            with col1:
                input_type = st.selectbox("Input Type", ["Text", "Image"])
        settings['input_type'] = input_type

        if input_type == "Image":
            if f"prompt_{functionality}_data" not in st.session_state:
                st.session_state[f"prompt_{functionality}_data"] = ""
            settings['prompt'] = st.text_area("Prompt (optional for image):", placeholder="e.g., Please classify the food in this image...", key=f"prompt_{functionality}", value=st.session_state[f"prompt_{functionality}_data"])
            with col2:
                selected_db = st.selectbox("Databases", list_databases(session))
                settings["db"] = selected_db
            with cols[0]:
                selected_schema = st.selectbox("Schemas", list_schemas(session, selected_db))
                settings["schema"] = selected_schema
            with cols[1]:
                selected_stage = st.selectbox("Stage", list_stages(session, selected_db, selected_schema))
                stage = f"@{selected_db}.{selected_schema}.{selected_stage}"
                settings["stage"] = stage
            if selected_stage:
                file_list = list_files_in_stage(session, selected_db, selected_schema, selected_stage)
                file_list = [file.split("/")[-1] for file in file_list]
                if not file_list:
                    st.warning("No files found in the selected stage.")
                    return
                with cols[2]:
                    settings["file"] = st.selectbox("Image File", file_list)
                if not settings["file"]:
                    st.warning("Please select an image file.")
                    return
                st.warning("Ensure the stage is not encrypted with SNOWFLAKE_FULL, AWS_CSE, or AZURE_CSE, and is not a user or table stage.")
        else:
            
            if f"text_{functionality}_data" not in st.session_state:
                st.session_state[f"text_{functionality}_data"] = ""
            
            settings['text'] = st.text_area("Enter text to classify:", placeholder="Type your text here...", key=f"text_{functionality}", value=st.session_state[f"text_{functionality}_data"])
            
        with st.expander("Categories", expanded=True):
            if f"categories_{functionality}_data" not in st.session_state:
                st.session_state[f"categories_{functionality}_data"] = ""
            category_input = st.text_area("Enter categories (comma-separated or JSON format):", placeholder="e.g., positive, neutral, negative or [{'label': 'positive', 'description': 'good vibes'}, ...]", key=f"categories_{functionality}", value=st.session_state[f"categories_{functionality}_data"])
            try:
                categories = json.loads(category_input)
                if not isinstance(categories, list):
                    raise ValueError("Categories must be a list.")
                if all(isinstance(c, dict) and 'label' in c for c in categories):
                    settings['categories'] = categories
                else:
                    settings['categories'] = [cat.strip() for cat in category_input.split(",") if cat.strip()]
            except json.JSONDecodeError:
                settings['categories'] = [cat.strip() for cat in category_input.split(",") if cat.strip()]
            if not settings['categories']:
                st.warning("Please provide at least one category.")
                return
            if len(settings['categories']) > 500:
                st.warning("Maximum 500 categories allowed.")
                return      

    elif functionality == "AI Filter":
        col1, col2 = st.columns(2)
        cols = st.columns(3)
        
        # Get input type from the main interface if available
        if "ai_filter_input_type" in st.session_state:
            input_type = st.session_state["ai_filter_input_type"]
        else:
            with col1:
                input_type = st.selectbox("Input Type", ["Text", "Image"])
        settings['input_type'] = input_type

        if input_type == "Text":
            if f"text_{functionality}_data" not in st.session_state:
                st.session_state[f"text_{functionality}_data"] = ""
            settings['text'] = st.text_area("Enter text to filter:", placeholder="e.g., Is this a positive review?", key=f"text_{functionality}", value=st.session_state[f"text_{functionality}_data"])
        else:
            if f"predicate_{functionality}_data" not in st.session_state:
                st.session_state[f"predicate_{functionality}_data"] = ""
            settings['predicate'] = st.text_area("Enter prompt for image filtering:", placeholder="e.g., Is this a picture of a cat?", key=f"predicate_{functionality}", value=st.session_state[f"predicate_{functionality}_data"])
            with col2:
                selected_db = st.selectbox("Databases", list_databases(session))
                settings["db"] = selected_db
            with cols[0]:
                selected_schema = st.selectbox("Schemas", list_schemas(session, selected_db))
                settings["schema"] = selected_schema
            with cols[1]:
                selected_stage = st.selectbox("Stage", list_stages(session, selected_db, selected_schema))
                stage = f"@{selected_db}.{selected_schema}.{selected_stage}"
                settings["stage"] = stage
            if selected_stage:
                file_list = list_files_in_stage(session, selected_db, selected_schema, selected_stage)
                file_list = [file.split("/")[-1] for file in file_list]
                if not file_list:
                    st.warning("No files found in the selected stage.")
                    return
                with cols[2]:
                    settings["file"] = st.selectbox("Image File", file_list)
                if not settings["file"]:
                    st.warning("Please select an image file.")
                    return
                st.warning("Ensure the stage is not encrypted with SNOWFLAKE_FULL, AWS_CSE, or AZURE_CSE, and is not a user or table stage.")

    elif functionality == "AI AGG":
        col1, col2 = st.columns(2)
        cols = st.columns(3)
        
        # Get input type from the main interface if available
        if "ai_agg_input_type" in st.session_state:
            input_type = st.session_state["ai_agg_input_type"]
        else:
            with col1:
                input_type = st.selectbox("Input Type", ["Text", "Table"])
        settings['input_type'] = input_type

        if settings['input_type'] == "Text":
            if f"text_input_{functionality}_data" not in st.session_state:
                st.session_state[f"text_input_{functionality}_data"] = ""
            settings['text_input'] = st.text_area(
                "Enter text input:",
                placeholder="e.g., [Excellent, Great, Mediocre]",
                key=f"text_input_{functionality}",
                value=st.session_state[f"text_input_{functionality}_data"]
            )
            if not settings['text_input']:
                st.warning("Text input is required for Text mode.")
                return None
        else:
            with col2:
                settings['db'] = st.selectbox("Database", list_databases(session))
            with cols[0]:
                settings['schema'] = st.selectbox("Schema", list_schemas(session, settings['db']))
            with cols[1]:
                settings['table'] = st.selectbox("Table", list_tables(session, settings['db'], settings['schema']))
            if settings['table']:
                columns = list_table_columns(session, settings['db'], settings['schema'], settings['table'])
                with cols[2]:
                    settings['text_column'] = st.selectbox("Text Column", columns)
                with st.expander("Group By (Optional)", expanded=False):
                    settings['group_by_column'] = st.selectbox("Group By Column", [None] + columns)
            else:
                st.warning("Please select a table.")
                return None
            
        if f"task_description_{functionality}_data" not in st.session_state:
            st.session_state[f"task_description_{functionality}_data"] = ""
        settings['task_description'] = st.text_area(
            "Task Description",
            placeholder="e.g., Summarize the product reviews for a blog post targeting consumers",
            key=f"task_description_{functionality}",
            value=st.session_state[f"task_description_{functionality}_data"]
        )
        if not settings['task_description']:
            st.warning("Task description is required.")
            return None

    elif functionality == "AI SUMMARIZE AGG":
        col1, col2 = st.columns(2)
        cols = st.columns(3)
        
        # Get input type from the main interface if available
        if "ai_summarize_agg_input_type" in st.session_state:
            input_type = st.session_state["ai_summarize_agg_input_type"]
        else:
            with col1:
                input_type = st.selectbox("Input Type", ["Text", "Table"])
        settings['input_type'] = input_type

        if settings['input_type'] == "Text":
            if f"text_input_{functionality}_data" not in st.session_state:
                st.session_state[f"text_input_{functionality}_data"] = ""
            settings['text_input'] = st.text_area(
                "Enter text input:",
                placeholder="e.g., [Excellent, Great, Mediocre]",
                key=f"text_input_{functionality}",
                value=st.session_state[f"text_input_{functionality}_data"]
            )
            if not settings['text_input']:
                st.warning("Text input is required for Text mode.")
                return None
        else:
            with col2:
                settings['db'] = st.selectbox("Database", list_databases(session))
            with cols[0]:
                settings['schema'] = st.selectbox("Schema", list_schemas(session, settings['db']))
            with cols[1]:
                settings['table'] = st.selectbox("Table", list_tables(session, settings['db'], settings['schema']))
            if settings['table']:
                columns = list_table_columns(session, settings['db'], settings['schema'], settings['table'])
                with cols[2]:
                    settings['text_column'] = st.selectbox("Text Column", columns)
                with st.expander("Group By (Optional)", expanded=False):
                    settings['group_by_column'] = st.selectbox("Group By Column", [None] + columns)
            else:
                st.warning("Please select a table.")
                return None

    elif functionality == "AI Complete":
        cols = st.columns(3)
        col1, col2 = st.columns(2)
        with cols[0]:
            settings['input_type'] = st.selectbox("Input Type", ["Text", "Image", "Prompt Object"])

        with cols[1]:
            model_type = st.selectbox("Model Type", ["Base", "Fine Tuned", "Private Preview"])
            if model_type == "Base":
                if settings['input_type'] == "Image":
                    models = [
                        'claude-4-opus', 'claude-4-sonnet', 'claude-3-7-sonnet', 'claude-3-5-sonnet',
                        'llama4-maverick', 'llama4-scout', 'openai-o4-mini', 'openai-gpt-4.1', 'pixtral-large'
                    ]
                    with cols[2]:
                        settings['model'] = st.selectbox("Change chatbot model:", models)
                else:
                    with cols[2]:
                        settings['model'] = st.selectbox("Change chatbot model:", defaults['model'])
            elif model_type == "Private Preview":
                settings['model'] = st.selectbox("Change chatbot model:", defaults['private_preview_models'])
            else:
                fine_tuned_models = fetch_fine_tuned_models(session)
                settings['model'] = st.selectbox("Change chatbot model:", fine_tuned_models)

        if settings['input_type'] == "Text":
            if f"prompt_{functionality}_data" not in st.session_state:
                st.session_state[f"prompt_{functionality}_data"] = ""
            settings['prompt'] = st.text_area("Enter a prompt:", placeholder="e.g., What are large language models?", key=f"prompt_{functionality}", value=st.session_state[f"prompt_{functionality}_data"])

        elif settings['input_type'] == "Image":
            with col1:
                settings['db'] = st.selectbox("Database", list_databases(session))
            with col2:
                settings['schema'] = st.selectbox("Schema", list_schemas(session, settings['db']))
            with col1:
                settings['stage'] = st.selectbox("Stage", list_stages(session, settings['db'], settings['schema']))
                if settings['stage']:
                    settings['stage'] = f"@{settings['db']}.{settings['schema']}.{settings['stage']}"
            if settings['stage']:
                file_list = list_files_in_stage(session, settings['db'], settings['schema'], settings['stage'].split('.')[-1])
                file_list = [file.split("/")[-1] for file in file_list]
                if not file_list:
                    st.warning("No files found in the selected stage.")
                    return None
                with col2:
                    settings['file'] = st.selectbox("Image File", file_list)
                if not settings['file']:
                    st.warning("Please select an image file.")
            if f"predicate_{functionality}_data" not in st.session_state:
                st.session_state[f"predicate_{functionality}_data"] = ""
            settings['predicate'] = st.text_area("Enter a prompt:", placeholder="e.g., Summarize the input image in no more than 2 words.", key=f"predicate_{functionality}", value=st.session_state[f"predicate_{functionality}_data"])
            if not settings['predicate']:
                st.warning("Prompt is required for Image input.")
            st.warning("Ensure the stage has server-side encryption enabled and is not client-side encrypted.")

        else:  # Prompt Object
            with col1:
                settings['db'] = st.selectbox("Database", list_databases(session))
            with col2:
                settings['schema'] = st.selectbox("Schema", list_schemas(session, settings['db']))
            with col1:
                settings['table'] = st.selectbox("Table", list_tables(session, settings['db'], settings['schema']))
            if settings['table']:
                columns = list_table_columns(session, settings['db'], settings['schema'], settings['table'])
                with col2:
                    settings['prompt_column'] = st.selectbox("Prompt Column", columns)
                with col1:
                    settings['file_column'] = st.selectbox("File Column (optional, for images)", [None] + columns)
            else:
                st.warning("Please select a table.")
                return None

        col1, col2 = st.columns(2)
        with col1:
            settings['show_details'] = st.checkbox("Show Detailed Output", value=False)
        with col2:
            settings['response_format_checkbox'] = st.checkbox("Change Response Format", value=False)

        with st.expander("Model Parameters", expanded=False):
            settings['temperature'] = st.slider("Temperature:", 0.0, 1.0, defaults['temperature'])
            settings['top_p'] = st.slider("Top P:", 0.0, 1.0, 0.0)
            settings['max_tokens'] = st.slider("Max Tokens:", 1, 8192, defaults['max_tokens'])
            settings['guardrails'] = st.checkbox("Enable Guardrails", value=defaults['guardrails'])

        if settings["response_format_checkbox"]:
            with st.expander("Response Format (Optional)", expanded=False):
                if f"response_format_{functionality}_data" not in st.session_state:
                    st.session_state[f"response_format_{functionality}_data"] = ""
                response_format_input = st.text_area(
                    "JSON Schema (optional):",
                    placeholder="e.g., {'type': 'json', 'schema': {'type': 'object', 'properties': {...}}}",
                    key=f"response_format_{functionality}",
                    value=st.session_state[f"response_format_{functionality}_data"]
                )
                
                if response_format_input:
                    try:
                        settings['response_format'] = json.loads(response_format_input)
                    except json.JSONDecodeError:
                        st.error("Invalid JSON schema. Please provide a valid JSON object.")
                        return None

    return settings

def get_playground_input(functionality):
    """
    Returns input data for playground mode based on selected functionality.
    """
    input_data = {}

    if functionality == "Complete":
        if f"prompt_text_{functionality}_data" not in st.session_state:
            st.session_state[f"prompt_text_{functionality}_data"] = ""
        input_data['prompt'] = st.text_area("Enter a prompt:", placeholder="Type your prompt here...", key=f"prompt_text_{functionality}", value=st.session_state[f"prompt_text_{functionality}_data"])
        st.session_state[f"prompt_text_{functionality}_data"] = input_data['prompt']

    elif functionality == "Complete Multimodal":
        if f"prompt_text_{functionality}_data" not in st.session_state:
            st.session_state[f"prompt_text_{functionality}_data"] = ""
        input_data['prompt'] = st.text_area("Enter a prompt:", placeholder="Type your prompt here...", key=f"prompt_text_{functionality}", value=st.session_state[f"prompt_text_{functionality}_data"])
        st.session_state[f"prompt_text_{functionality}_data"] = input_data['prompt']

    elif functionality == "Translate":
        if f"text_{functionality}_data" not in st.session_state:
            st.session_state[f"text_{functionality}_data"] = ""
        input_data['text'] = st.text_area("Enter text to translate:", placeholder="Type your text here...", key=f"text_{functionality}", value=st.session_state[f"text_{functionality}_data"])
        st.session_state[f"text_{functionality}_data"] = input_data['text']

    elif functionality == "Summarize":
        if f"text_{functionality}_data" not in st.session_state:
            st.session_state[f"text_{functionality}_data"] = ""
        input_data['text']= st.text_area("Enter text to summarize:", placeholder="Type your text here...", key=f"text_{functionality}", value=st.session_state[f"text_{functionality}_data"])
        st.session_state[f"text_{functionality}_data"] = input_data['text']
    
    elif functionality == "Extract":
        if f"text_{functionality}_data" not in st.session_state:
            st.session_state[f"text_{functionality}_data"] = ""
        if f"query_{functionality}_data" not in st.session_state:
            st.session_state[f"query_{functionality}_data"] = ""
        
        input_data['text'] = st.text_area("Enter the text:", placeholder="Type your text here...", key=f"text_{functionality}", value=st.session_state[f"text_{functionality}_data"])
        st.session_state[f"text_{functionality}_data"] = input_data['text']
        st.text_input("Enter your query:", placeholder="Type your query here...", key=f"query_{functionality}", value=st.session_state[f"query_{functionality}_data"])

    elif functionality == "Sentiment":
        toggle = st.toggle("ENTITY_SENTIMENT")
        input_data["toggle"] = toggle
        if toggle:
            if f"text_{functionality}_data" not in st.session_state:
                st.session_state[f"text_{functionality}_data"] = ""
            if f"entities_{functionality}_data" not in st.session_state:
                st.session_state[f"entities_{functionality}_data"] = ""
            st.text_input("Enter text for entity sentiment analysis:", placeholder="Type your text here...", key=f"text_{functionality}", value=st.session_state[f"text_{functionality}_data"])
            
            st.text_input("Enter entities (comma-separated):", placeholder="Type your entities here...", key=f"entities_{functionality}", value=st.session_state[f"entities_{functionality}_data"])
            
        else:
            if f"text_{functionality}_data" not in st.session_state:
                st.session_state[f"text_{functionality}_data"] = ""
            input_data['text']=st.text_area("Enter text for sentiment analysis:", placeholder="Type your text here...", key=f"text_{functionality}", value=st.session_state[f"text_{functionality}_data"])
            st.session_state[f"text_{functionality}_data"] = input_data['text']

    elif functionality == "Classify Text":
    
        if f"text_{functionality}_data" not in st.session_state:
            st.session_state[f"text_{functionality}_data"] = ""
        if f"categories_{functionality}_data" not in st.session_state:
            st.session_state[f"categories_{functionality}_data"] = ""
        input_data['text']=st.text_area("Enter text to classify:", placeholder="Type your text here...", key=f"text_{functionality}", value=st.session_state[f"text_{functionality}_data"])
        st.session_state[f"text_{functionality}_data"] = input_data['text']
        st.text_input("Enter categories (comma-separated):", placeholder="Type your categories here...", key=f"categories_{functionality}", value=st.session_state[f"categories_{functionality}_data"])

    elif functionality == "Parse Document":
        input_data["mode"] = st.selectbox("Mode", ["OCR", "LAYOUT"])

    return input_data

def display_playground(session):
    """
    Displays the playground mode interface in Streamlit.
    """
    st.title("Playground")
            
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    if "cortex_chat" not in st.session_state:
        st.session_state.cortex_chat = []
    
    slide_window = 20

    # Use dynamic column layout based on whether Input Type is needed
    functionality_list = ["Complete", "Complete Multimodal","Translate", "Summarize", "Extract", "Sentiment","Classify Text","Parse Document", "AI Complete", "AI Similarity", "AI Classify","AI Filter", "AI AGG","AI SUMMARIZE AGG"]
    
    # First get initial selections
    initial_col1, initial_col2 = st.columns(2)
    with initial_col1:
        choices = st.selectbox("Choose Functionality", ["LLM Functions","Chat"])
    
    if choices == "LLM Functions":
        with initial_col2:
            functionality = st.selectbox("Choose functionality:", functionality_list)
        
        # Check if Input Type is needed for this functionality
        needs_input_type = functionality in ["AI Classify", "AI Filter", "AI AGG", "AI SUMMARIZE AGG"]
        
        if needs_input_type:
            # Add Input Type in a new row below
            input_type_col = st.columns(1)[0]
            with input_type_col:
                if functionality == "AI Classify":
                    input_type_ai_classify = st.selectbox("Input Type", ["Text", "Image"], key="ai_classify_input_type")
                elif functionality == "AI Filter":
                    input_type_ai_filter = st.selectbox("Input Type", ["Text", "Image"], key="ai_filter_input_type")
                elif functionality == "AI AGG":
                    input_type_ai_agg = st.selectbox("Input Type", ["Text", "Table"], key="ai_agg_input_type")
                elif functionality == "AI SUMMARIZE AGG":
                    input_type_ai_summarize_agg = st.selectbox("Input Type", ["Text", "Table"], key="ai_summarize_agg_input_type")

        if functionality != "Select Functionality":
            settings = get_functionality_settings(functionality, config, session)
            input_data = get_playground_input(functionality)

            # Helper function to create audio input and callback
            def create_audio_input_for_run(key_prefix, text_key):
                if f"{key_prefix}_output" not in st.session_state:
                    st.session_state[f"{key_prefix}_output"] = ""

                if text_key not in st.session_state:
                    st.session_state[text_key] = ""
                
                def update_text():
                    audio_text = st.session_state.get(f"{key_prefix}_output", "").strip()
                    if audio_text:
                        st.session_state[text_key] = audio_text
                        st.rerun()

                st.session_state[f"update_{key_prefix}"] = update_text
                
                # Only use speech_to_text if in debug mode
                if config.get("mode") == "debug":
                    audio_input = speech_to_text(
                        language='en',
                        start_prompt="🎙️",
                        stop_prompt="🔴",
                        just_once=False,
                        callback=update_text,
                        args=(),
                        kwargs={},
                        key=f"{key_prefix}"
                    )
                return st.session_state.get(text_key, "").strip()

            # Check if audio input is needed for this functionality (only in debug mode)
            has_audio_input = False
            if config.get("mode") == "debug":
                if functionality == "Complete":
                    has_audio_input = True
                elif functionality == "Complete Multimodal":
                    has_audio_input = True
                elif functionality == "Translate":
                    has_audio_input = True
                elif functionality == "Extract":
                    has_audio_input = True
                elif functionality == "Sentiment":
                    # Check if entity sentiment toggle is active
                    if not input_data.get("toggle", False):
                        has_audio_input = True
                elif functionality == "AI Classify":
                    # Check input type for AI Classify
                    if settings and settings.get('input_type') == "Image":
                        has_audio_input = True
                elif functionality == "AI Complete":
                    # AI Complete has audio input but no enhancement
                    has_audio_input = True


            has_enhancement = False
            if functionality == "Complete":
                has_enhancement = True
            elif functionality == "Complete Multimodal":
                has_enhancement = True
            elif functionality == "Translate":
                has_enhancement = True
            elif functionality == "Extract":
                has_enhancement = True
            elif functionality == "Sentiment":
                # Check if entity sentiment toggle is active
                if not input_data.get("toggle", False):
                    has_enhancement = True
            # elif functionality == "AI Classify":
            #     # Check input type for AI Classify
            #     if settings and settings.get('input_type') == "Image":
            #         has_enhancement = True

            # Create columns based on whether audio input and enhancement are needed
            if has_audio_input and has_enhancement:
                audio_col, enhance_col, run_col = st.columns([1.5, 4, 30])
                
                with audio_col:
                    if functionality == "Complete":
                        create_audio_input_for_run(f"speech_to_text_{functionality}", f"prompt_text_{functionality}_data")
                    elif functionality == "Complete Multimodal":
                        create_audio_input_for_run(f"speech_to_text_{functionality}", f"prompt_text_{functionality}_data")
                    elif functionality == "Translate":
                        create_audio_input_for_run(f"speech_to_text_{functionality}", f"text_{functionality}_data")
                    elif functionality == "Extract":
                        create_audio_input_for_run(f"speech_to_text_query_{functionality}", f"query_{functionality}_data")
                    elif functionality == "Sentiment":
                        create_audio_input_for_run(f"speech_to_text_text_{functionality}", f"text_{functionality}_data")
                    elif functionality == "AI Classify":
                        create_audio_input_for_run(f"speech_to_text_prompt_{functionality}", f"prompt_{functionality}_data")
                
                with enhance_col:
                    # Helper function to get the appropriate prompt field key
                    def get_prompt_field_key(functionality, settings):
                        if functionality == "Complete":
                            return f"prompt_text_{functionality}_data"
                        elif functionality == "Complete Multimodal":
                            return f"prompt_text_{functionality}_data"
                        elif functionality == "Translate":
                            return f"text_{functionality}_data"
                        elif functionality == "Extract":
                            return f"query_{functionality}_data"
                        elif functionality == "Sentiment":
                            return f"text_{functionality}_data"
                        # elif functionality == "AI Classify":
                        #     return f"prompt_{functionality}_data"
                        # elif functionality == "AI Complete":
                        #     if settings.get('input_type') == "Text":
                        #         return f"prompt_{functionality}_data"
                        #     elif settings.get('input_type') == "Image":
                        #         return f"predicate_{functionality}_data"
                        return None

                    # Function to handle enhancement when selectbox changes
                    def handle_enhancement_change():
                        enhancement_key = f"enhancement_type_{functionality}"
                        if enhancement_key in st.session_state:
                            selected_enhancement = st.session_state[enhancement_key]
                            if selected_enhancement.lower() != "refine":
                                prompt_key = get_prompt_field_key(functionality, settings)
                                if prompt_key and prompt_key in st.session_state:
                                    current_prompt = st.session_state[prompt_key]
                                    if current_prompt and current_prompt.strip():
                                        try:
                                            # Get model from settings if available
                                            model = None
                                            if settings and 'model' in settings:
                                                model = settings['model']
                                            
                                            enhanced_prompt = enhance_prompt(
                                                session, 
                                                current_prompt, 
                                                selected_enhancement.lower(), 
                                                model
                                            )
                                            print("enhaned_prompt", enhanced_prompt)
                                            if enhanced_prompt and enhanced_prompt != current_prompt:
                                                st.session_state[prompt_key] = enhanced_prompt
                                                st.rerun()
                                        except Exception as e:
                                            st.error(f"Error enhancing prompt: {e}")

                    # Enhancement type selector with auto-trigger
                    enhancement_options = ["Refine", "Elaborate", "Rephrase", "Shorten", "Formal", "Informal"]
                    selected_enhancement = st.selectbox(
                        "some", 
                        enhancement_options, 
                        index=0,  # Default to "Refine"
                        key=f"enhancement_type_{functionality}",
                        on_change=handle_enhancement_change,
                        label_visibility="collapsed"  
                    )

                with run_col:
                    if st.button("Run"):
                        st.session_state['execute_functionality'] = True
                        st.session_state['execution_params'] = {
                            'session': session,
                            'functionality': functionality,
                            'input_data': input_data,
                            'settings': settings
                        }
                        
            elif has_audio_input and not has_enhancement:
                audio_col, run_col = st.columns([1.5, 30])
                
                with audio_col:
                    if functionality == "AI Complete":
                        # Determine the appropriate key based on input type
                        if settings and settings.get('input_type') == "Text":
                            create_audio_input_for_run(f"speech_to_text_prompt_{functionality}", f"prompt_{functionality}_data")
                        elif settings and settings.get('input_type') == "Image":
                            create_audio_input_for_run(f"speech_to_text_predicate_{functionality}", f"predicate_{functionality}_data")

                with run_col:
                    if st.button("Run"):
                        st.session_state['execute_functionality'] = True
                        st.session_state['execution_params'] = {
                            'session': session,
                            'functionality': functionality,
                            'input_data': input_data,
                            'settings': settings
                        }
            elif not has_audio_input and has_enhancement:
                enhance_col, run_col = st.columns([4, 30])
                
                with enhance_col:
                    # Helper function to get the appropriate prompt field key
                    def get_prompt_field_key(functionality, settings):
                        if functionality == "Complete":
                            return f"prompt_text_{functionality}_data"
                        elif functionality == "Complete Multimodal":
                            return f"prompt_text_{functionality}_data"
                        elif functionality == "Translate":
                            return f"text_{functionality}_data"
                        elif functionality == "Extract":
                            return f"query_{functionality}_data"
                        elif functionality == "Sentiment":
                            return f"text_{functionality}_data"
                        return None

                    # Function to handle enhancement when selectbox changes
                    def handle_enhancement_change():
                        enhancement_key = f"enhancement_type_{functionality}"
                        if enhancement_key in st.session_state:
                            selected_enhancement = st.session_state[enhancement_key]
                            if selected_enhancement.lower() != "refine":
                                prompt_key = get_prompt_field_key(functionality, settings)
                                if prompt_key and prompt_key in st.session_state:
                                    current_prompt = st.session_state[prompt_key]
                                    if current_prompt and current_prompt.strip():
                                        try:
                                            # Get model from settings if available
                                            model = None
                                            if settings and 'model' in settings:
                                                model = settings['model']
                                            
                                            enhanced_prompt = enhance_prompt(
                                                session, 
                                                current_prompt, 
                                                selected_enhancement.lower(), 
                                                model
                                            )
                                            print("enhaned_prompt", enhanced_prompt)
                                            if enhanced_prompt and enhanced_prompt != current_prompt:
                                                st.session_state[prompt_key] = enhanced_prompt
                                                st.rerun()
                                        except Exception as e:
                                            st.error(f"Error enhancing prompt: {e}")

                    # Enhancement type selector with auto-trigger
                    enhancement_options = ["Refine", "Elaborate", "Rephrase", "Shorten", "Formal", "Informal"]
                    selected_enhancement = st.selectbox(
                        "Enhancement", 
                        enhancement_options, 
                        index=0,  # Default to "Refine"
                        key=f"enhancement_type_{functionality}",
                        on_change=handle_enhancement_change,
                        label_visibility="collapsed"
                    )

                with run_col:
                    if st.button("Run"):
                        st.session_state['execute_functionality'] = True
                        st.session_state['execution_params'] = {
                            'session': session,
                            'functionality': functionality,
                            'input_data': input_data,
                            'settings': settings
                        }
            else:
                # No audio input or enhancement needed, just show the Run button without extra spacing
                if st.button("Run"):
                    st.session_state['execute_functionality'] = True
                    st.session_state['execution_params'] = {
                        'session': session,
                        'functionality': functionality,
                        'input_data': input_data,
                        'settings': settings
                    }
            
            # Execute functionality outside column structure for full width display
            if st.session_state.get('execute_functionality', False):
                st.session_state['execute_functionality'] = False
                params = st.session_state.get('execution_params', {})
                try:
                    execute_functionality(params['session'], params['functionality'], params['input_data'], params['settings'])
                except SnowparkSQLException as e:
                    st.error(f"Error: {e}")
   
    elif choices == "Chat":
        options = st.selectbox("Choose one of the options", ["Search Service","RAG","Cortex Agent"])
        
        if options == "Search Service":
            # Settings in expander
            with st.expander("Settings", expanded=True):
                st.subheader("Choose Your Search Service")
                col1, col2 = st.columns(2)
                with col1:
                    selected_db = st.selectbox("Database", list_databases(session))
                with col2:
                    selected_schema = st.selectbox("Schema", list_schemas(session, selected_db))

                col1, col2 = st.columns(2)
                with col1:
                    cortex_services = list_cortex_services(session,selected_db,selected_schema)
                    selected_service = st.selectbox("Service", cortex_services or [])
                attributes = []
                if selected_service:
                    if "prev_selected_service" not in st.session_state:
                        st.session_state.prev_selected_service = selected_service
                    if st.session_state.prev_selected_service != selected_service:
                        st.session_state.cortex_chat = []
                        st.session_state.prev_selected_service = selected_service 

                    with col2:
                        data = fetch_cortex_service(session,selected_service,selected_db,selected_schema)
                        row = data[0]
                        cols = row.columns.split(",")
                        attributes = row.attribute_columns.split(",")
                        columns = st.multiselect("Display Columns", cols)
                
                st.subheader("Create Filter & Limits")
                col3, col4 = st.columns(2)
                with col3:
                    filter_column = st.selectbox("Filter Columns", attributes)
                with col4:
                    filter_operator = st.selectbox("Filter Operator", ["@eq", "@contains", "@gte", "@lte"])
                filter_value = st.text_input(f"Enter value for {filter_operator} on {filter_column}")

                if filter_column and filter_operator and filter_value:
                    if filter_operator == "@eq":
                        filter = { "@eq": { filter_column: filter_value } }
                    elif filter_operator == "@contains":
                        filter = { "@contains": { filter_column: filter_value } }
                    elif filter_operator == "@gte":
                        filter = { "@gte": { filter_column: filter_value } }
                    elif filter_operator == "@lte":
                        filter = { "@lte": { filter_column: filter_value } }
                    st.write(f"Generated Filter: {filter}")
                else:
                    filter = {}
                limit = st.slider("Limit Results", min_value=1, max_value=10, value=1)

                st.subheader("Choose Your Model")
                col5, col6 = st.columns(2)
                with col5:
                    model_type = st.selectbox("Model Type", ["Base","Fine Tuned", "Private Preview"])
                with col6:
                    if model_type == "Base":
                        selected_model = st.selectbox("Model", config["default_settings"]["model"])
                    elif model_type == "Private Preview":
                        selected_model = st.selectbox("Model", config["default_settings"]["private_preview_models"])
                    else:
                        fine_tuned_models = fetch_fine_tuned_models(session)
                        selected_model = st.selectbox("Model", fine_tuned_models)

            # Chat container
            chat_placeholder = st.container(border=True, height=700)
            with chat_placeholder:
                st.subheader("Chat Messages")
                for message in st.session_state.get("cortex_chat", []):
                    with st.chat_message(message["role"]):
                        st.markdown(message["content"])
            
            if question := st.chat_input("Enter your question"):
                if not columns:
                    show_toast_message("Please select columns to display.", position="bottom-right")
                    return
                st.session_state.cortex_chat.append({"role": "user", "content": question})
                with chat_placeholder: 
                    with st.chat_message("user"):
                        st.markdown(question)
                try:
                    root = Root(session)
                    service = (root
                            .databases[selected_db]
                            .schemas[selected_schema]
                            .cortex_search_services[selected_service.lower()]
                            )
                    columns = [col.lower() for col in columns]
                    resp = service.search(
                        query=question,
                        columns=columns,
                        filter=filter, 
                        limit=int(limit)
                    )
                    
                    retrieved_data = resp 

                    def get_chat_history():
                        start_index = max(0, len(st.session_state.cortex_chat) - slide_window)
                        filtered_history = [
                            msg for msg in st.session_state.messages[start_index:] if not msg["content"].startswith("An error occurred") 
                        ]
                        return filtered_history
                        
                    chat_history = get_chat_history()
                    
                    prompt = f"""
                            You are an AI assistant using Retrieval-Augmented Generation (RAG). Your task is to provide accurate and relevant answers based on the user's question, the retrieved context from a Cortex Search Service, and the prior chat history (if any). Follow these instructions:
                            1. Use the chat history to understand the conversation context, if context is empty, refer retrieved context.
                            2. Use the retrieved context to ground your answer in the provided data (this is in json form, so under the json keys and values fully).
                            3. Answer the question concisely and directly, without explicitly mentioning the sources (chat history or retrieved context) unless asked.   
                    
                            Note: Identify if the user is asking a question from the chat history or the retrieved context. If the user is asking a question from the chat history, answer the question based on the chat history. If the user is asking a question from the retrieved context, answer the question based on the retrieved context. If the user is asking a question from the chat history and the retrieved context, answer the question based on the chat history. If the user is asking a question that is not from the chat history or the retrieved context, answer the question based on the chat history.
                            
                            <chat_history>
                            {chat_history}
                            </chat_history>

                            <retrieved_context>
                            {retrieved_data}
                            </retrieved_context>

                            <question>
                            {question}
                            </question>

                            Answer:
                            """
                    
                    if prompt:
                        prompt = prompt.replace("'", "\\'")
                    res = execute_query_and_get_result(session,prompt,selected_model,"Generate RAG Response")

                    result_json = json.loads(res)
                    response_1 = result_json.get("choices", [{}])[0].get("messages", "No messages found")
                    st.session_state.cortex_chat.append({"role": "assistant", "content": response_1})
                    with chat_placeholder:
                        with st.chat_message("assistant"):
                            st.markdown(response_1)
                except Exception as e:
                    add_log_entry(session, "Generate Search Response", str(e))
                    with chat_placeholder:
                        with st.chat_message("assistant"):
                            st.markdown("An error occurred. Please check logs for details.")
                    st.session_state.cortex_chat.append({"role": "assistant", "content": "An error occurred. Please check logs for details."})

                # st.rerun(scope="fragment")
        
        elif options == "RAG":
            # Settings in expander
            with st.expander("Settings", expanded=True):
                st.subheader("Choose Your Embeddings")
                col1, col2 = st.columns(2)
                with col1:
                    selected_db = st.selectbox("Database", list_databases(session))
                with col2:
                    selected_schema = st.selectbox("Schema", list_schemas(session, selected_db))

                col1, col2 = st.columns(2)
                with col1:
                    selected_table = st.selectbox("Table", list_tables(session, selected_db, selected_schema) or [] )
                    if "prev_selected_table" not in st.session_state:
                        st.session_state.prev_selected_table = selected_table
                    if st.session_state.prev_selected_table != selected_table:
                        st.session_state.messages = []
                        st.session_state.prev_selected_table = selected_table            
                
                with col2:
                    if selected_table:
                        required_columns = ["Vector_Embeddings"]
                        missing_cols = validate_table_columns(session, selected_db, selected_schema, selected_table, required_columns)
                        if missing_cols:
                            st.info("The table is missing vector_embeddings column. Please use the appropriate table.")
                        else:
                            selected_column = st.selectbox("Column", ["Vector_Embeddings"])

                st.subheader("Choose Your Models") 
                col1,col2=  st.columns(2)
                with col1:
                    model_type = st.selectbox("Model Type", ["Base","Fine Tuned", "Private Preview"])
                with col2:
                    if model_type == "Base":
                        selected_model = st.selectbox("Model", config["default_settings"]["model"])
                    elif model_type == "Private Preview":
                        selected_model = st.selectbox("Model", config["default_settings"]["private_preview_models"])
                    else:
                        fine_tuned_models = fetch_fine_tuned_models(session)
                        selected_model = st.selectbox("Model", fine_tuned_models)
                st.info("Use the same embedding type and model consistently when creating embeddings.")
                col4, col5 = st.columns(2)
                with col4:
                    embeddings = list(config["default_settings"]["embeddings"].keys())
                    embedding_type = st.selectbox("Embeddings", embeddings[1:])
                with col5:
                    embedding_model = st.selectbox("Embedding Model", config["default_settings"]["embeddings"][embedding_type])

            # Chat container
            rag_chat_container = st.container(border=True, height=700)
            with rag_chat_container:
                st.subheader("Chat Messages")
                for message in st.session_state.get("messages", []):
                    with st.chat_message(message["role"]):
                        st.markdown(message["content"])
            
            rag = st.checkbox("Use your own documents as context?", value=True)
            if question := st.chat_input("Enter your question"):
                st.session_state.messages.append({"role": "user", "content": question})
                with rag_chat_container: 
                    with st.chat_message("user"):
                        st.markdown(question)
                try:
                    def get_chat_history():
                        start_index = max(0, len(st.session_state.cortex_chat) - slide_window)
                        filtered_history = [
                            msg for msg in st.session_state.messages[start_index:]
                            if not msg["content"].startswith("An error occurred") 
                        ]
                        return filtered_history
                    
                    chat_history = get_chat_history()

                    prompt = create_prompt_for_rag(session, question, rag, selected_column, selected_db, selected_schema, selected_table,embedding_type,embedding_model, chat_history)
                    if prompt:
                        prompt = prompt.replace("'", "\\'")
                    result = execute_query_and_get_result(session, prompt, selected_model, "Generate RAG Response")
                    result_json = json.loads(result)
                    response = result_json.get("choices", [{}])[0].get("messages", "No messages found")
                    st.session_state.messages.append({"role": "assistant", "content": response})
                    with rag_chat_container:
                        with st.chat_message("assistant"):
                            st.markdown(response)
                except Exception as e:
                    add_log_entry(session, "Generate RAG Response", str(e))
                    st.error("An error occurred :  Check if same embedding type and model are selected. Please check the logs for details.")

        elif options == "Cortex Agent":
            st.subheader("Chat with Agent")
            agent_manager = CortexAgentManager(session)
            agents = agent_manager.get_all_agents()
            chat_agent_name = st.selectbox("Agent", [agent.name for agent in agents], key="chat_agent_name")
            if chat_agent_name:
                agent = next(a for a in agents if a.name == chat_agent_name)
                question = st.text_input("Ask a question", placeholder="Type your question here...", key="question")

                if st.button("Send", key="send"):
                    if question.strip():
                        with st.spinner("Processing your request..."):
                            text, sql = agent.chat(session, question)
                            if text:
                                with st.chat_message("assistant"):
                                    st.markdown(text.replace("•", "\n\n").replace("【†", "[").replace("†】", "]"))  # Format bullet points
                                st.session_state.setdefault("messages", []).append({"role": "assistant", "content": text})
                            if sql:
                                st.markdown("### Generated SQL")
                                st.code(sql, language="sql")
                                sql_result = run_snowflake_query(session, sql)
                                st.write("### Query Results")
                                st.dataframe(sql_result)
                    else:
                        st.error("Question cannot be empty")

