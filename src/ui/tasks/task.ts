import sha256 from "crypto-js/sha256";
import type { Brand } from "src/brand";
import type { ColumnTag, ColumnTagTable } from "../columns/columns";
import { getTagsFromContent } from "src/parsing/tags/tags";

export class Task {
	constructor(
		rawContent: TaskString,
		fileHandle: { path: string },
		readonly rowIndex: number,
		columnTagTable: ColumnTagTable,
		private readonly consolidateTags: boolean
	) {
		const [, blockLink] = rawContent.match(blockLinkRegexp) ?? [];
		this.blockLink = blockLink;

		const match = (
			blockLink ? rawContent.replace(blockLinkRegexp, "") : rawContent
		).match(taskStringRegex);

		if (!match) {
			throw new Error(
				"Attempted to create a task from invalid raw content"
			);
		}

		const [, status, content] = match;
		if (!content) {
			throw new Error("Content not found in raw content");
		}

		const tags = getTagsFromContent(content);

		this._id = sha256(content + fileHandle.path + rowIndex).toString();
		this.content = content;
		this._done = status === "x";
		this._path = fileHandle.path;

		// the last matched tag will be used, all other matched tag will be deleted.
		// a boolean should be added, so that the user may decide the behavior related to remove the other matched tags.
		for (const tag of tags) {
			if (tag in columnTagTable || tag === "done") {
				if (!this._column) {
					this._column = tag as ColumnTag;
				}
				tags.delete(tag); 
				if (!consolidateTags) {
					let regExp1 = new RegExp(`#${tag} |#${tag}$`,"g")
					/*
					the regexp of tag is "#\S " with a space at the end.
					However, in obsidian, when the tag is at the end of line, 
					it is accepted when the last space is omitted. 
					*/
					this.content = this.content
						.replace(regExp1, " ")
						.trim();
				}
			}
			if (consolidateTags) {
				let regExp1 = new RegExp(`#${tag} |#${tag}$`,"g")
				/*
				the regexp of tag is "#\S " with a space at the end.
				However, in obsidian, when the tag is at the end of line, 
				it is accepted when the last space is omitted. 
				*/
				this.content = this.content
					.replace(regExp1, " ")
					.trim();
			}
		}

		this.tags = tags;
		this.blockLink = blockLink;

		if (this._done) {
			this._column = undefined;
		}
	}

	private _id: string;
	get id() {
		return this._id;
	}

	content: string;

	private _done: boolean;
	get done(): boolean {
		return this._done;
	}
	set done(done: true) {
		this._done = done;
		this._column = undefined;
	}

	private _deleted: boolean = false;

	private readonly _path: string;
	get path() {
		return this._path;
	}

	private _column: ColumnTag | "archived" | undefined;
	get column(): ColumnTag | "archived" | undefined {
		return this._column;
	}
	set column(column: ColumnTag) {
		this._column = column;
		this._done = false;
	}

	readonly blockLink: string | undefined;
	readonly tags: ReadonlySet<string>;

	serialise(): string {
		if (this._deleted) {
			return "";
		}

		return [
			`- [${this.done ? "x" : " "}] `,
			this.content.trim(),
			this.consolidateTags && this.tags.size > 0
				? ` ${Array.from(this.tags)
						.map((tag) => `#${tag}`)
						.join(" ")}`
				: "",
			this.column ? ` #${this.column}` : "",
			this.blockLink ? ` ^${this.blockLink}` : "",
		]
			.join("")
			.trimEnd();
	}

	archive() {
		this._done = true;
		this._column = "archived";
	}

	delete() {
		this._deleted = true;
	}
}

type TaskString = Brand<string, "TaskString">;

export function isTaskString(input: string): input is TaskString {
	if (input.includes("#archived")) {
		return false;
	}
	return taskStringRegex.test(input);
}

// begins with 0 or more whitespace chars
// then follows the pattern "- [ ]" OR "- [x]"
// then contains an additional whitespace before any trailing content
const taskStringRegex = /^\s*-\s\[([xX\s])\]\s(.+)/;
const blockLinkRegexp = /\s\^([a-zA-Z0-9-]+)$/;
