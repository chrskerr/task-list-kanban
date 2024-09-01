//

import type { Brand } from "src/brand";
import { getTagsFromContent } from "../tags/tags";

export function parseTaskContent(
	rawContent: string,
	parseLinktext: (content: string) => { path: string; subpath: string }
): TaskContent {
	const [, blockLink] = rawContent.match(blockLinkRegexp) ?? [];

	const match = (
		blockLink ? rawContent.replace(blockLinkRegexp, "") : rawContent
	).match(taskStringRegex);

	if (!match) {
		throw new Error("Attempted to create a task from invalid raw content");
	}

	const status = match[1];
	let content = match[2];
	if (!content) {
		throw new Error("Content not found in raw content");
	}

	const tags = getTagsFromContent(content);

	let linkId = 0;
	const internalLinks: TaskContent["internalLinks"] = [];
	const internalLinksMatches = content.matchAll(internalLinksRegex);
	for (const [label, match] of internalLinksMatches) {
		if (match) {
			const target = parseLinktext(match);
			const id = String(linkId++);

			content = content.replace(label, ` [${match}](#internal-${id})`);

			internalLinks.push({
				id,
				target,
				linkText: label,
			});
		}
	}

	return {
		content,
		blockLink,
		isDone: status === "x",
		tags,
		internalLinks,
	};
}

export type TaskString = Brand<string, "TaskString">;
export type TaskContent = {
	content: string;
	tags: Set<string>;
	isDone: boolean;
	internalLinks: {
		id: string;
		linkText: string;
		target: {
			path: string;
			subpath: string;
		};
	}[];
	blockLink: string | undefined;
};

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
const blockLinkRegexp = /\s\^([\p{L}\p{N}-]+)$/u;

const internalLinksRegex = /\s\[\[([^\]]+)\]\]/g;
