import { Plugin } from 'obsidian';
import {SPMDSettingTab, DEFAULT_SETTINGS} from './SPMDSettingTab.js'
import {SuggestionPopup} from './popupView';

// const DEFAULT_SETTINGS = {
// 	extensions: "spmd,csmd"
//  writerDefault: ""
//  contactDefault: ""
// };

class SPMD extends Plugin {
	async onload() {

		this._suggestionPopup = new SuggestionPopup(this.app);
		this.registerEditorSuggest(this._suggestionPopup);


		await this.loadSettings();
		this.addSettingTab(new SPMDSettingTab(this.app, this));

		// register extensions
		this.addExtensions();

		this.addCustomCommands();

		this.enable();

		console.log("Obsidian-Scripts Plugin Loaded")
	}
	async onunload() {
		this.disable()
		console.log('Obsidian-Scripts Plugin Unloaded')
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
				editor.setLine(cursor.line, `~~${line}~~`)
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
