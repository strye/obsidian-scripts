import { EditorSuggest } from "obsidian";
//import matter from "gray-matter";

// Example for EditorSugestion 
//   https://github.com/tth05/obsidian-completr/tree/master


export class SuggestionPopup extends EditorSuggest {
    constructor(app) {
        super(app);
		this._focused = false;
		this._justClosed = true;
		this._fileType = "";
		this._frontMatter = null;
		this._characterRegex = new RegExp("[a-zA-ZöäüÖÄÜß]", "u");
    }

    open() {
        super.open();
        this._focused = true;
    }

    close() {
        super.close();
        this._focused = false;
    }

    getSuggestions(context) { //EditorSuggestContext
        let search = context.query.val.toLowerCase(),
		suggestions = [];
		this.getCharacters();
		switch (context.query.cType) {
			case 1: suggestions = this.getTransitions(); break;
			case 2: suggestions = this.getLocations(); break;
			case 3: suggestions = this.getCharacters(); break;
			case 4: suggestions = this.getPaerntheticals(); break;
		}

		return suggestions?.filter(s => s.toLowerCase().startsWith(search));
    }

    onTrigger(cursor, editor, file) {
		this._fileType = null;
		//if (file.extension !== 'spmd') return null;
		if (!this.isValidFile(file)) return null;

		let cType = 0,
		line = editor.getLine(cursor.line);

		if (line.startsWith('# ')) cType = 1;
		if (line.startsWith('## ')) cType = 2;
		if (line.startsWith('>')) cType = 3;
		if (line.startsWith('(') || line.startsWith('~~(')) cType = 4;


		if (cType === 0) return null;
		
		
		let res = this.internalOnTrigger(editor, cursor, cType);
		//console.log(res);
        return res;
    }
    internalOnTrigger(editor, cursor, contextType) {
        if (this._justClosed) {
            this._justClosed = false;
            return null;
        }

		let { query, separatorChar 
		} = this.matchWordBackwards(editor, cursor);
		// this._separatorChar = separatorChar;

		return {
			start: {
				line: cursor.line,
				ch: cursor.ch - query.length,
			},
			end: cursor,
			query: {cType:contextType, val:query}
		};
    }
	matchWordBackwards(editor, cursor, maxLookBackDistance = 50) { //: { query: string, separatorChar: string }
		let query = "", separatorChar = null;
	
		// Save some time for very long lines
		let lookBackEnd = Math.max(0, cursor.ch - maxLookBackDistance);
		
		// Find word in front of cursor
		for (let i = cursor.ch - 1; i >= lookBackEnd; i--) {
			const prevChar = editor.getRange({ ...cursor, ch: i }, { ...cursor, ch: i + 1 });
			if (!this._characterRegex.test(prevChar)) {
				separatorChar = prevChar;
				break;
			}
	
			query = prevChar + query;
		}
	
		return { query, separatorChar };
	}



    renderSuggestion(value, el) { //value: Suggestion, el: HTMLElement
        // Add the text.
        const text = el.doc.createElement("div");
        // text.addClass("completr-suggestion-text");
        text.setText(value);
        el.appendChild(text);
    }

    selectSuggestion(value, evt) { //value: Suggestion, evt: MouseEvent | KeyboardEvent
		const replacement = value;
        const start = this.context.start;

        const endPos = this.context.end;
        this.context.editor.replaceRange(replacement, start, {
            ...endPos,
            ch: Math.min(endPos.ch, this.context.editor.getLine(endPos.line).length)
        });
		this.context.editor.setCursor({ ...start, ch: start.ch + replacement.length });

        this.close();
        this._justClosed = true;
    }

	
	isValidFile(noteFile) {
		this._frontMatter = this.app.metadataCache.getFileCache(noteFile)?.frontmatter;
		let classes = this._frontMatter?.cssclasses;
		if (classes === "spmd" ||
		classes?.includes("spmd")) this._fileType = "spmd";
		if (classes === "csmd" ||
		classes?.includes("csmd")) this._fileType = "csmd";

		return (["spmd", "csmd"].includes(this._fileType));
	}
	getCharacters() {
		return this._frontMatter?.characters;
	}
	getLocations() {
		return this._frontMatter?.locations;
	}
	getTransitions() {
		if (this._frontMatter?.transitions) {
			return Transitions.concat(this._frontMatter?.transitions);
		}
		else { return Transitions; }
	}
	getPaerntheticals() {
		if (this._frontMatter?.parentheticals) {
			return Parentheticals.concat(this._frontMatter?.parentheticals);
		}
		else { return Parentheticals; }
	}

}


const Transitions = [
	"Fade In",
	"Fade Out",
	"Smash Cut",
	"Match Cut",
	"Fade To Black",
	"Cut to Scene",
]
const Parentheticals = [
	"PAUSE",
	"SHOUTING",
    "PAINFULLY",
    "TEARFULLY",
    "WHISPERING",
    "LAUGHING",
	"SHRUGGING",
]