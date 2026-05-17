# CocoPlus

**CocoPlus** is an AI-powered development lifecycle plugin for the Snowflake Cortex Code CLI. It brings structured, multi-agent workflows to data engineering projects — covering everything from project initialization through spec, plan, build, test, review, and ship phases.

Built using only Coco-native constructs: Skills, Agents, Hooks, and AGENTS.md.

---

## Source of Truth

`Snow-Cocoplus/` is the reference folder for this plugin. The implementation in `.cortex/`, `templates/`, `recipes/`, and `docs/` is validated against that reference:

- `Snow-Cocoplus/docs/*.md` generates the public HTML pages in `docs/` while preserving the existing site shell and stylesheet.
- `Snow-Cocoplus/flow-view.html.template` and `Snow-Cocoplus/meter-view.html.template` are mirrored into `templates/`.
- `scripts/validate-cocoplus.js` checks required agents, hooks, skill paths, templates, recipes, manifest registrations, docs sync, and orchestration routing.

Run validation before shipping plugin changes:

```
node scripts/validate-cocoplus.js
```

---

## What It Does

CocoPlus wraps a structured development lifecycle around every project — from requirements capture through production ship — enforcing phase gates, parallel specialist execution, and checkpoint-validated delivery at each step. It decomposes work across eight specialist personas matched to domain, runs them in isolated git worktrees, and tracks every decision, token, and quality finding across sessions. A multi-layer safety gate protects production Snowflake objects from accidental modification, while a persistent pattern library and project knowledge base compound institutional memory over time. Thirty-five features covering orchestration, evaluation, governance, cost visibility, prompt engineering, pre-spec commitment, multi-agent deliberation, and context distillation — all running on Coco-native constructs with no external services.

## Specialist Personas

`$de` Data Engineer · `$ae` Analytics Engineer · `$ds` Data Scientist · `$da` Data Analyst  
`$bi` BI Analyst · `$dpm` Data Product Manager · `$dst` Data Steward · `$cdo` Chief Data Officer

---

## Installation

```
cortex skill add Snowflake-Labs/cocoplus
```

Verify:

```
cortex plugins list
# cocoplus should appear in the output
```

## Getting Started

```
$pod init       — initialize CocoPlus in your project
$cocoplus on    — activate all features
$spec           — start the requirements phase
```

See [cocoplus.dev](https://cocoplus.dev) for the full documentation site.

---

## Requirements

- Snowflake Cortex Code CLI (`coco`) with plugin support
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
