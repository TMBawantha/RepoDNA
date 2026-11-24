# RepoDNA product direction

RepoDNA starts as a repository architecture explorer. Over time, it can connect the structure of a codebase with how it changes, helping developers understand unfamiliar repositories and assess the impact of changes.

## MVP priority

Finish the dependency visualization engine first. Start with the repository metadata, file tree, and file classification already available. Fetch relevant source files, resolve internal imports, build the dependency graph, and make it explorable. The Insights and Health work below is planned for after this milestone.

## Future capabilities

| Area                      | What it helps developers understand                                 |
| ------------------------- | ------------------------------------------------------------------- |
| Repository Insights       | Commit activity, contributors, code frequency, releases, and growth |
| Architecture Intelligence | Modules, files, imports, and dependency relationships               |
| Codebase Health           | Complexity, coupling, circular dependencies, and potential risks    |

Start Repository Insights with commit activity, contributors, and code frequency. Releases and growth metrics can follow, along with pull request and issue analytics, fork trends, and community standards. Traffic and clone statistics require authentication and suitable repository permissions. Actions performance can be evaluated separately when its access requirements are understood.

GitHub's public statistics endpoints can return `202 Accepted` while data is being calculated. Code frequency is unavailable for repositories with 10,000 or more commits. These conditions should appear as pending or unavailable when the feature is built. [GitHub repository statistics](https://docs.github.com/en/rest/metrics/statistics) · [GitHub repository traffic](https://docs.github.com/en/rest/metrics/traffic)

RepoDNA will compute internal dependency and health metrics from the code it analyzes. Pairing those findings with development history could help developers identify modules that are both frequently changed and highly coupled.

## Dashboard concept

The future dashboard could offer Overview, Architecture, Activity, and Health views. Overview could show source-file and contributor counts, dependencies, and circular imports. Activity could chart weekly commits. The language distribution can build on the existing file-count classification.

A future `src/modules/insights/` module can own activity data and its presentation within the current feature-based structure.
