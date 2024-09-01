import sha256 from "crypto-js/sha256";
import type { ColumnTag, ColumnTagTable } from "../columns/columns";
import { parseTaskContent, type TaskString } from "src/parsing/tasks/tasks";
import { parseLinktext } from "obsidian";

export class Task {
	constructor(
		rawContent: TaskString,
		fileHandle: { path: string },
		readonly rowIndex: number,
		columnTagTable: ColumnTagTable
	) {
		const { blockLink, isDone, content, tags, internalLinks } =
			parseTaskContent(rawContent, parseLinktext);
		this.blockLink = blockLink;

		this._id = sha256(content + fileHandle.path + rowIndex).toString();
		this.content = content;
		this._done = isDone;
		this._path = fileHandle.path;
		this._internalLinks = internalLinks;

		for (const tag of tags) {
			if (tag in columnTagTable || tag === "done") {
				if (!this._column) {
					this._column = tag as ColumnTag;
				}
				tags.delete(tag);
				this.content = this.content.replaceAll(`#${tag}`, "").trim();
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

	private readonly _internalLinks: {
		id: string;
		target: { path: string; subpath: string };
		linkText: string;
	}[];
	get internalLinks() {
		return this._internalLinks;
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
