<p align="center">
  <img src="docs/cocoplus_logo_color.svg" alt="CocoPlus logo" width="200">
</p>

# CocoPlus

**CocoPlus** is an Agentic Operating System for Snowflake Coco. It brings structured, multi-agent workflows to data engineering projects — covering everything from project initialization through spec, plan, build, test, review, ship phases, browser observability, autonomous orchestration, and governance-aware execution.

Built using only Coco-native constructs: Skills, Agents, Hooks, and AGENTS.md.

## What It Does

CocoPlus wraps a structured development lifecycle around every project — from requirements capture through production ship — enforcing phase gates, parallel specialist execution, and checkpoint-validated delivery at each step. It decomposes work across fixed and dynamic specialist personas, runs coordinated workstreams, and tracks decisions, tokens, quality findings, contracts, memory, and governance signals across sessions.

The current operating layer includes:

- **CocoConsole**: a local, read-only browser control plane launched with `$cocoplus console`.
- **CocoPilot**: opt-in natural-language orchestration with `$pilot on` / `$pilot off`.
- **CocoForge**: goal-driven expert-team meta-loop with `$forge`.
- **Leviathan Mode + Ronin**: explicit-activation autonomous coordination with a personal assistant return briefing.
- **Dynamic Personas**: evidence-gated emergent specialists with retained history.
- **Governance hooks**: ReviewerLockout and PII governance with observe/enforce rollout.
- **Feature-owned runtime**: hooks enqueue deterministic work through feature-owned skill contracts; CocoConsole is the only registered local runtime script.
- **CocoFlow orchestration**: tiered planning, dependency-group dispatch, named artifacts, thinking-effort tuning, divergence at branch points, synthesis passes, and `$flow template` reuse.
- **CocoSession continuity**: PROGRESS handoff, predicate context, iteration budget, operator kill-switch, and one-shot steering for long-running work.
- **Evidence and proposal gates**: opt-in stage evidence checks and retained Snowflake-write proposals settled with `$flow settle`.
- **CocoRoutine**: opt-in Snowflake TASK scheduling for completed self-contained flows with `$routine`.
- **Research, retrospective, hygiene, and correctness loops**: `$flow research`, `$retrospective run`, `$hygiene --model-upgrade`, `$meter benchmark`, and `$meter compare` make quality improvement measurable.
- **Console-aware visual commands**: `$flow view` and `$meter view` redirect into CocoConsole when it is running.

The root plugin implements the current runtime and documentation surface while preserving older project state through explicit migration skills.

Older CocoPods migrate forward with `$migrate v2 --dry-run` and `$migrate v2`; new work should use the feature-owned skills directly.

## Specialist Personas

`$de` Data Engineer · `$ae` Analytics Engineer · `$ds` Data Scientist · `$da` Data Analyst  
`$bi` BI Analyst · `$dpm` Data Product Manager · `$dst` Data Steward · `$cdo` Chief Data Officer

---

## Installation

In Coco, enter:

```
Install this plugin from [Snowflake-Labs/cocoplus](https://github.com/Snowflake-Labs/cocoplus)
```

### Upgrading an Existing CocoPlus Project

After installing the current plugin, open each existing CocoPlus project and run:

```text
$migrate v2 --dry-run
$migrate v2
```

Use the dry run first. It reports the exact project-state changes, tests, validation checks, and cleanup actions before anything is written.

For manual installation details, see [INSTALLATION.md](INSTALLATION.md).

## Getting Started

```
$pod init       — initialize CocoPlus in your project
$cocoplus on    — activate all features
$cocoplus console — open the read-only dashboard
$pilot on       — activate CocoPilot for the current session
$session status — inspect multi-session handoff and operator controls
$spec           — start the requirements phase
```

See [cocoplus.dev](https://cocoplus.dev) for the full documentation site.

---

## Requirements

- Snowflake Coco CLI (`coco`) with plugin support
- Node.js (for hooks — Windows/Mac/Linux compatible)
- Git

## License

MIT — see [LICENSE](LICENSE)

## Warranty

The Software is provided as Open Source. This software is provided “as is” and any express or implied warranties, including, but not limited to, the implied warranties of merchantability and fitness for a particular purpose are disclaimed. In no event shall the owner or contributors be liable for any direct, indirect, incidental, special, exemplary, or consequential damages (including, but not limited to, procurement of substitute goods or services; loss of use, data, or profits; or business interruption) however caused and on any theory of liability, whether in contract, strict liability, or tort (including negligence or otherwise) arising in any way out of the use of this software, even if advised of the possibility of such damage.

## Legal

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

This is an Open Source repository and not an official Snowflake offering. This tool is not endorsed by Snowflake or any of the previous or current employers of the developers.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. SNOWFLAKE is a trademark of Snowflake Computing, Inc in the United States and/or other countries. Any use of third-party trademarks or logos are subject to those third-party's policies.
