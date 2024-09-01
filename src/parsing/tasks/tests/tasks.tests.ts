//

import { describe, expect, it } from "vitest";
import { isTaskString, parseTaskContent, type TaskContent } from "../tasks";

describe("parseTaskContent", () => {
	it("parses a basic task string", () => {
		let task: TaskContent | undefined;
		const taskString = "- [ ] Something #tag";
		if (isTaskString(taskString)) {
			task = parseTaskContent(taskString, parseLinktext);
		}

		expect(task).toBeTruthy();
		expect(task?.content).toBe("Something #tag");
		expect(task?.tags.has("tag")).toBeTruthy();
	});

	it("parses a task string with a block link", () => {
		let task: TaskContent | undefined;
		const taskString = "- [ ] Something #tag #column ^link-link";
		if (isTaskString(taskString)) {
			task = parseTaskContent(taskString, parseLinktext);
		}

		expect(task).toBeTruthy();
		expect(task?.content).toBe("Something #tag");
		expect(task?.blockLink).toBe("link-link");
	});

	it("parses a task string with internal links", () => {
		let task: TaskContent | undefined;
		const taskString = "- [ ] Something [[one]] [[two]]";
		if (isTaskString(taskString)) {
			task = parseTaskContent(taskString, parseLinktext);
		}

		expect(task).toBeTruthy();
		expect(task?.internalLinks.length).toBe(2);
		expect(task?.content).toBe(
			"Something [one](#internal-0) [two](#internal-1)"
		);
	});
});

const parseLinktext = (content: string) => ({
	path: content,
	subpath: "",
});
