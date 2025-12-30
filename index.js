const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

const MAX_COMMENT_SIZE = 60000; // GitHub limit is 65,536, leave buffer

const expandDetailsComment = core.getBooleanInput('expand-comment');
const includePlanSummary = core.getBooleanInput('include-plan-job-summary');
const myToken = core.getInput('github-token');
const octokit = github.getOctokit(myToken);
const context = github.context;
const inputFilenames = core.getMultilineInput('json-file');
const headerFile = core.getInput('header-file');
const footerFile = core.getInput('footer-file');
const commentHeaderInput = core.getMultilineInput('comment-header');
const commentFooterInput = core.getMultilineInput('comment-footer');
const quietMode = core.getInput('quiet') === 'true';
const includeLinkToWorkflow = core.getInput('include-workflow-link') === 'true';

// Read header from file if provided, otherwise use comment-header input
let commentHeader;
if (headerFile) {
    core.info(`Header file input: ${headerFile}`);
    if (fs.existsSync(headerFile)) {
        commentHeader = fs.readFileSync(headerFile, 'utf8').trim();
        core.info(`Read header from file: ${commentHeader}`);
    } else {
        core.warning(`Header file not found: ${headerFile}`);
        commentHeader = commentHeaderInput.join('\n');
    }
} else {
    commentHeader = commentHeaderInput.join('\n');
}

// Read footer from file if provided, otherwise use comment-footer input
let commentFooter;
if (footerFile) {
    core.info(`Footer file input: ${footerFile}`);
    if (fs.existsSync(footerFile)) {
        commentFooter = fs.readFileSync(footerFile, 'utf8').trim();
        core.info(`Read footer from file (${commentFooter.length} chars)`);
    } else {
        core.warning(`Footer file not found: ${footerFile}`);
        commentFooter = commentFooterInput.join('\n');
    }
} else {
    commentFooter = commentFooterInput.join('\n');
}


const workflowLink = includeLinkToWorkflow ? `
[Workflow: ${context.workflow}](${ context.serverUrl }/${ context.repo.owner }/${ context.repo.repo }/actions/runs/${ context.runId })
` : "";

let hasNoChanges = false;

const output = () => {
    let body = '';
    // for each file
    for (const file of inputFilenames) {
        const resource_changes = JSON.parse(fs.readFileSync(file)).resource_changes;
        try {
            if (Array.isArray(resource_changes) && resource_changes.length > 0) {
                const resources_to_create = [],
                    resources_to_update = [],
                    resources_to_delete = [],
                    resources_to_replace = [],
                    resources_unchanged = [];

                // for each resource changes
                for (const resource of resource_changes) {
                    const change = resource.change;
                    const address = resource.address;

                    switch (change.actions[0]) {
                        default:
                            break;
                        case "no-op":
                            resources_unchanged.push(address);
                            break;
                        case "create":
                            resources_to_create.push(address);
                            break;
                        case "delete":
                            if (change.actions.length > 1) {
                                resources_to_replace.push(address);
                            } else {
                                resources_to_delete.push(address);
                            }
                            break;
                        case "update":
                            resources_to_update.push(address);
                            break;
                    }
                }
                // the body must be indented at the start otherwise
                // there will be formatting error when comment is 
                // showed on GitHub
                body += `
${commentHeader}
<details ${expandDetailsComment ? "open" : ""}>
<summary>
<b>Terraform Plan: ${resources_to_create.length} to be created, ${resources_to_delete.length} to be deleted, ${resources_to_update.length} to be updated, ${resources_to_replace.length} to be replaced, ${resources_unchanged.length} unchanged.</b>
</summary>
${details("create", resources_to_create, "+")}
${details("delete", resources_to_delete, "-")}
${details("update", resources_to_update, "!")}
${details("replace", resources_to_replace, "+")}
</details>
${commentFooter}
${workflowLink}
`
            } else {
                hasNoChanges = true;
                body += `
<p>There were no changes done to the infrastructure.</p>
`
                core.info(`"The content of ${file} did not result in a valid array or the array is empty... Skipping."`)
            }
        } catch (error) {
            core.error(`${file} is not a valid JSON file. error: ${error}`);
        }
    }
    return body;
}

const details = (action, resources, operator) => {
    let str = "";

    if (resources.length !== 0) {
        str = `
#### Resources to ${action}\n
\`\`\`diff\n
`;
        for (const el of resources) {
            // In the replace block, we show delete (-) and then create (+)
            if (action === "replace") {
                str += `- ${el}\n`
            }
            str += `${operator} ${el}\n`
        }

        str += "```\n"
    }

    return str;
}

const splitComment = (body) => {
    if (body.length <= MAX_COMMENT_SIZE) {
        return [body];
    }

    const chunks = [];
    let remaining = body;

    while (remaining.length > 0) {
        if (remaining.length <= MAX_COMMENT_SIZE) {
            chunks.push(remaining);
            break;
        }

        // Find last newline before MAX_COMMENT_SIZE
        let splitIndex = remaining.lastIndexOf('\n', MAX_COMMENT_SIZE);
        if (splitIndex === -1) {
            splitIndex = MAX_COMMENT_SIZE; // Fallback: hard split
        }

        let chunk = remaining.substring(0, splitIndex);

        // Check if we're inside an open code block and close it
        const codeBlockCount = (chunk.match(/```/g) || []).length;
        if (codeBlockCount % 2 !== 0) {
            chunk += '\n```';
        }

        // Check if we're inside an open <details> tag and close it
        const detailsOpenCount = (chunk.match(/<details/g) || []).length;
        const detailsCloseCount = (chunk.match(/<\/details>/g) || []).length;
        if (detailsOpenCount > detailsCloseCount) {
            chunk += '\n</details>';
        }

        chunks.push(chunk);
        remaining = remaining.substring(splitIndex + 1);
    }

    // Add part headers and wrap continuation chunks in details
    if (chunks.length > 1) {
        return chunks.map((chunk, i) => {
            if (i === 0) {
                return `**Part ${i + 1}/${chunks.length}**\n\n${chunk}`;
            } else {
                // Wrap continuation chunks in collapsed details
                return `**Part ${i + 1}/${chunks.length}**\n\n<details>\n<summary><b>Continued...</b></summary>\n\n${chunk}\n</details>`;
            }
        });
    }

    return chunks;
}

(async () => {
    try {
        if (includePlanSummary) {
            core.info("Adding plan output to job summary")
            core.summary.addHeading('Terraform Plan Results').addRaw(output()).write()
        }

        if (context.eventName === 'pull_request') {
            core.info(`Found PR # ${context.issue.number} from workflow context - proceeding to comment.`)
        } else {
            core.warning("Action doesn't seem to be running in a PR workflow context.")
            core.warning("Skipping comment creation.")
            process.exit(0);
        }

        if (quietMode && hasNoChanges) {
            core.info("Quiet mode is enabled and there are no changes to the infrastructure.")
            core.info("Skipping comment creation.")
            process.exit(0);
        }

        const commentBody = output();
        const chunks = splitComment(commentBody);

        core.info(`Adding ${chunks.length} comment(s) to PR`);
        core.info(`Comment: ${commentBody}`);

        for (let i = 0; i < chunks.length; i++) {
            core.info(`Posting comment ${i + 1} of ${chunks.length}...`);
            try {
                const response = await octokit.rest.issues.createComment({
                    issue_number: context.issue.number,
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    body: chunks[i]
                });
                core.info(`Comment ${i + 1} posted successfully. URL: ${response.data.html_url}`);
            } catch (commentError) {
                core.error(`Failed to post comment ${i + 1}: ${commentError.message}`);
                throw commentError;
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
})();