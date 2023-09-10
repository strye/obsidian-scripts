'use strict';

var obsidian$1 = require('obsidian');

const obsidian = require("obsidian");

const DEFAULT_SETTINGS = {
	extensions: "spmd,csmd"
};

class SPMDSettingTab extends obsidian.PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Settings for managing extensions." });
		new obsidian.Setting(containerEl)
		.setName("File Extensions")
		.setDesc("Comma delimited list of file extensions")
		.addText((text) => text.setPlaceholder("Enter your extensions")
		.setValue(this.plugin.settings.extensions).onChange(async (value) => {
			this.plugin.settings.extensions = value;
			await this.plugin.saveSettings();
		}));
	}
}

//import matter from "gray-matter";

// Example for EditorSugestion 
//   https://github.com/tth05/obsidian-completr/tree/master


class SuggestionPopup extends obsidian$1.EditorSuggest {
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
];
const Parentheticals = [
	"PAUSE",
	"SHOUTING",
    "PAINFULLY",
    "TEARFULLY",
    "WHISPERING",
    "LAUGHING",
	"SHRUGGING",
];

// const DEFAULT_SETTINGS = {
// 	extensions: "spmd,csmd"
//  writerDefault: ""
//  contactDefault: ""
// };

class SPMD extends obsidian$1.Plugin {
	async onload() {

		this._suggestionPopup = new SuggestionPopup(this.app);
		this.registerEditorSuggest(this._suggestionPopup);


		await this.loadSettings();
		this.addSettingTab(new SPMDSettingTab(this.app, this));

		// register extensions
		this.addExtensions();

		this.addCustomCommands();

		this.enable();

		console.log("Obsidian-Scripts Plugin Loaded");
	}
	async onunload() {
		this.disable();
		console.log('Obsidian-Scripts Plugin Unloaded');
	}

	enable() {}
	disable() {}

	addCustomCommands() {
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'smd-line-strikethrough',
			name: 'Strikethrough Line',
			editorCallback: (editor, view) => { //editor: Editor, view: MarkdownView
				let cursor = editor.getCursor(),
				line= editor.getLine(cursor.line);
				editor.setLine(cursor.line, `~~${line}~~`);
			}
		});	
	}
	registerCustomEvents() {
		// this.registerEvent(
		// 	this.app.workspace.on("editor-change",
		// 	async (editor, markdownView) => {
		// 		let pos = editor.getCursor(),
		// 		line = editor.getLine(pos.line);

		// 		//console.log('getValue',editor.getValue());
		// 		console.log(editor.wordAt({line: pos.line, ch:0}));


		// 		if (pos.ch ===1 && line.startsWith('(')) {
		// 			console.log('PING!', line);
		// 			new CharacterCues(this.app).open();
		// 		}

		// 		// console.log(markdownView.getViewType())
		// 		// console.log(markdownView.getMode())
		// 		// this.statusBar.updateAltBar();
		// 	})
		// );

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}
	async addExtensions() {
		// Convert setting to array
		let exts = this.settings.extensions.split(",");
		exts = exts.map(function (el) {
			return el.trim();
		});
		// register the view and extensions
		this.registerExtensions(exts, "markdown");
	}

}
module.exports = SPMD;
