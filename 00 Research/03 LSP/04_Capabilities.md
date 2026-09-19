### 1. Completion (`textDocument/completion`)

*   **Purpose**: Provides an on-demand list of autocompletion suggestions as a developer types in the editor to accelerate coding and prevent syntax errors.
*   **Client Responsibility**: Automatically detects completion trigger contexts (such as typing `.` or explicit shortcuts like `Ctrl+Space`), sends the current text document URI and exact cursor coordinates to the server, and displays the formatted suggestions list to the user. If an item is selected, it may request additional details for lazy loading.
*   **Server Responsibility**: Announces support for autocompletion in its initialization handshake. Once requested, it parses the codebase AST around the cursor coordinates, filters applicable scope symbols, and returns a collection of candidate completion items. It can optionally provide a resolve handler to dynamically compute detailed tooltips or import strings for a selected completion item.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/completion`). Optionally followed by Client $\rightarrow$ Server Request (`completionItem/resolve`).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI), `position` (`line` and `character` indexes), and optional `context` (e.g., `triggerCharacter`).
    *   **Result**: An array of `CompletionItem` objects. Key fields include:
        *   `label`: The primary completion text.
        *   `kind`: Integer category (e.g., Function, Method, Variable).
        *   `filterText`: Optional custom text used by the client when filtering matches.
        *   `data`: Opaque, serializable metadata passed transparently back to the server during a `resolve` request.

---

### 2. Hover (`textDocument/hover`)

*   **Purpose**: Displays documentation, types, and compiler annotations for a symbol directly beneath the editor cursor when a user hovers over it.
*   **Client Responsibility**: Tracks hover durations over tokens, triggers the semantic request when a cursor stays on a position, and renders the returned documentation payload (typically transforming Markdown into styled tooltips).
*   **Server Responsibility**: Receives the file coordinate, uses its semantic engine to identify the target token, extracts doc-comments (such as Javadoc or TSDoc), and translates the symbol definition into formatted documentation.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/hover`).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI) and `position` (line and character).
    *   **Result**: A `Hover` object containing `contents` (a `MarkupContent` block declaring its syntax `kind` as `"markdown"` or `"plaintext"` and its corresponding text string), and an optional coordinate `range` outlining the hover target.

---

### 3. Definition Lookup (`textDocument/definition`)

*   **Purpose**: Navigates the developer directly to the file and exact line location where a targeted symbol was originally declared (e.g., "Go to Definition").
*   **Client Responsibility**: Catches click events (like `Cmd/Ctrl+Click` or `F12`), maps the coordinates, sends the position request, and jumps the editor cursor focus to the returned URI and text range.
*   **Server Responsibility**: Decodes the request coordinates, checks compiler symbol tables to locate where the variable, function, or class was declared in the project, and computes its exact target range.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/definition`).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI) and `position` (line and character).
    *   **Result**: A `Location` object or an array of `Location` / `LocationLink` objects. Key fields include:
        *   `uri`: The target file scheme URI.
        *   `range`: Coordinates (`start` and `end` positions) mapping where the declaration begins and ends.

---

### 4. References (`textDocument/references`)

*   **Purpose**: Scans the entire project workspace to locate and list every instance where a targeted symbol is referenced or called.
*   **Client Responsibility**: Catches reference requests (like context menu action or code lens clicks), sends coordinates with context filters, and shows the reference match list in a split sidebar or inline panel.
*   **Server Responsibility**: Accesses its internal workspace-wide search indexing, gathers all locations matching the targeted symbol declaration, and computes their exact file coordinates.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/references`).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI), `position` (line and character), and a `context` structure (containing a boolean `includeDeclaration` flag indicating whether to include the initial signature).
    *   **Result**: An array of `Location` objects, each detailing the matching file `uri` and exact target `range`.

---

### 5. Rename (`textDocument/rename`)

*   **Purpose**: Performs a safe, project-wide refactoring of a symbol, renaming every one of its references synchronously across multiple files without breaking compilation.
*   **Client Responsibility**: Prompts the user to input a new name, sends the target symbol's position alongside the new string, and executes the transactional workspace file edits returned by the server.
*   **Server Responsibility**: Resolves the symbol, tracks down all references across the entire codebase AST, generates exact text replacements (edits) for every file, and groups them in an atomic transaction payload.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/rename`).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI), `position` (line and character), and `newName` (string).
    *   **Result**: A `WorkspaceEdit` object containing a `changes` dictionary mapping file URIs directly to an array of `TextEdit` operations (specifying `range` and `newText`).

---

### 6. Formatting (`textDocument/formatting`)

*   **Purpose**: Standardizes document presentation (indentation, line breaks, spacing) according to configured code style guidelines.
*   **Client Responsibility**: Triggers format operations (on save, manual command, or typing trigger), dynamically reads editor configurations (like tab size and indent style), sends parameters alongside the file URI, and applies the resulting text substitutions.
*   **Server Responsibility**: Employs formatting routines to process the target file, dynamically checks client preferences via a `workspace/configuration` lookup if needed, calculates formatting diffs, and returns minimal code replacements.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/formatting`). (Note: The server may optionally issue a Server $\rightarrow$ Client `workspace/configuration` request first to resolve file-specific settings).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI) and `options` (containing `tabSize` and `insertSpaces` booleans).
    *   **Result**: An array of `TextEdit` objects defining the text blocks to replace.

---

### 7. Diagnostics (`textDocument/publishDiagnostics`)

*   **Purpose**: Surfaces compiler errors, type conflicts, and code quality (linter) issues to the developer as they write code.
*   **Client Responsibility**: Listens for diagnostic updates from the server and instantly renders corresponding markers (e.g., wavy squiggles or sidebar warning ticks) at the reported line coordinates.
*   **Server Responsibility**: Registers validation listeners. When files open, close, or change, the background compiler analyzes the codebase, parses code errors, packages warning ranges, and pushes diagnostic payloads to the client.
*   **Request Flow**: **Server $\rightarrow$ Client Notification** (`textDocument/publishDiagnostics`). This is a unidirectional, asynchronous notification with no return handshake.
*   **Data Exchanged**:
    *   **Params**: `uri` (document path) and `diagnostics` (an array of compiler issues). Each diagnostic entry contains:
        *   `range`: Exact start and end coordinates.
        *   `severity`: Integer code (e.g., 1 for Error, 2 for Warning, 3 for Info, 4 for Hint).
        *   `message`: Descriptive compiler error text.
        *   `tags`: Optional diagnostic markers (e.g., Deprecated or Unnecessary code).

---

### 8. Code Actions (`textDocument/codeAction`)

*   **Purpose**: Offers context-sensitive quick fixes, auto-refactorings, or source code edits (e.g., sorting imports) that directly address compiler diagnostics.
*   **Client Responsibility**: Dispatches the current selection range alongside active diagnostics in that range, renders the quick-fix lightbulb list, and applies the selected action's workspace edits or calls its associated command.
*   **Server Responsibility**: Compares the client's current context and error codes to known fix templates (such as removing unused variables, adding missing imports, or resolving type signatures) and returns matching `CodeAction` objects.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/codeAction`).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI), `range` (cursor span), and `context` containing an array of active `diagnostics` and optional action kinds.
    *   **Result**: An array of `CodeAction` or `Command` items. Key fields include:
        *   `title`: The display string shown to the developer (e.g., "Organize Imports").
        *   `kind`: String matching standard identifiers (e.g., `source.organizeImports.ts` or `quickfix`).
        *   `edit`: Optional `WorkspaceEdit` transaction applied immediately.
        *   `command`: Optional system command executed to apply complex logic.

---

### 9. Semantic Tokens (`textDocument/semanticTokens`)

*   **Purpose**: Enhances standard regex syntax highlighting with rich compiler-level type resolution (e.g., distinguishing a local variable from a global property or an interface name).
*   **Client Responsibility**: Requests semantic tokens for a document's viewport, parses the returned integer array, and highlights the corresponding text tokens using the active theme.
*   **Server Responsibility**: Leverages type verification and scope checking to compile structural types of symbols, encodes them using relative offsets, and maps them to token indices declared during the handshake.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/semanticTokens/full` or `/range`).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI).
    *   **Result**: A structured object containing a compressed `data` array of integers. Every five values in the sequence represent delta-encoded offsets (`lineDelta`, `charDelta`, token `length`, `tokenType` index, and `tokenModifiers` bitmask).

---

### 10. Symbols (`textDocument/documentSymbol` / `workspace/symbol`)

*   **Purpose**: Generates lists of defined program symbols (such as class outlines, function names, and variable structures) either locally in a single file or globally across the entire project.
*   **Client Responsibility**: Displays the document hierarchy inside an outline sidebar or opens a quick-pick workspace symbol search input, letting developers quickly jump to symbol coordinates.
*   **Server Responsibility**: Traverses file ASTs, aggregates logical class, method, or variable declaration landmarks, and converts them into structured locations.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/documentSymbol` or `workspace/symbol`).
*   **Data Exchanged**:
    *   **Params**: For document symbols: `textDocument` (URI). For workspace symbols: `query` (search string).
    *   **Result**: An array of hierarchical `DocumentSymbol` objects (containing recursive arrays of children, symbol kind, and range boundaries) or flat `SymbolInformation` arrays.

---

### 11. Folding (`textDocument/foldingRange`)

*   **Purpose**: Identifies code folding boundaries (such as class definitions, code blocks, comment zones, or import groups) to clean up visual layouts in the editor gutter.
*   **Client Responsibility**: Requests valid fold coordinates for a document and displays expand/collapse gutter controls.
*   **Server Responsibility**: Traces AST code structure, parses comment boundaries or structural brackets, maps start and end lines of nested segments, and flags their folding categories.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/foldingRange`).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI).
    *   **Result**: An array of `FoldingRange` objects, containing:
        *   `startLine` and `endLine` integers outlining block limits.
        *   `kind`: Optional category identifier (e.g., `"comment"`, `"imports"`, `"region"`).

---

### 12. Inline Values (`textDocument/inlineValue`)

*   **Source Limit Note**: *The provided source materials do not explicitly detail the parameters or payload structure of the `textDocument/inlineValue` capability. However, within the LSP ecosystem, this feature works alongside related tools like inlay hints and hover tooltips as follows:*
*   **Purpose**: Computes local variable values during active debugger sessions, displaying current execution states directly next to corresponding code lines in the editor window.
*   **Client Responsibility**: Listens to debugger execution updates, resolves visible code coordinates, requests matching runtime evaluations, and displays the state tags next to source lines.
*   **Server Responsibility**: Uses scope lookups at the requested line coordinates, resolves local variable names, references debugger context variables, and formats state summaries.
*   **Request Flow**: Client $\rightarrow$ Server Request (`textDocument/inlineValue`).
*   **Data Exchanged**:
    *   **Params**: `textDocument` (URI), `range` (active viewport coordinates), and a `context` structure (containing the current debugger execution `frameId` and context variables).
    *   **Result**: An array of inline value blocks (such as literal text displays, variable lookup references, or evaluation formats).
