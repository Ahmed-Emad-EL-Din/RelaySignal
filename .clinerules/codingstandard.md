don't add any comments to the code.
after each task add the new features and edit if the old feature has update.
if the new edit require from the developer user different setup edit SETUP-AND-CONFIGURATION.md
after solving any error add in summarize what the error,what it mean and how u fixed it
before installing any library or downloading any thing make sure that it not already existed in the pc



# FILE EDITING & SEARCH PATTERN RULES
When editing files using search and replace tools, you MUST strictly adhere to the following rules to prevent pattern mismatch errors:

1. **Exact Matching:** Your SEARCH blocks must exactly match the existing file content character-for-character. This includes all indentation, spaces, tabs, empty lines, and trailing commas.
2. **Sufficient Context:** Always include at least 2 to 3 lines of unchanged code *before* and *after* the section you are modifying. This ensures your search pattern is unique and targets the correct part of the file.
3. **No Placeholders:** NEVER use placeholders, summaries, or comments like `// ... existing code ...` or `/* rest of component */` inside a SEARCH block. You must write out the exact code.
4. **Failure Protocol:** If an edit fails with a "search patterns don't match" error, you MUST immediately re-read the file to get the exact, current text before attempting another edit. Do not blindly guess the formatting.