# CocoPlus

**CocoPlus** is an AI-powered development lifecycle plugin for the Snowflake Cortex Code CLI. It brings structured, multi-agent workflows to data engineering projects — covering everything from project initialization through spec, plan, build, test, review, and ship phases.

Built using only Coco-native constructs: Skills, Agents, Hooks, and AGENTS.md.

---

## What It Does

- **CocoBrew** — 6-phase development lifecycle (Spec → Plan → Build → Test → Review → Ship)
- **CocoHarvest** — Parallel specialist personas working in isolated git worktrees
- **CocoFlow** — JSON pipeline orchestration for multi-stage agent execution
- **CocoGrove** — Pattern library that learns from your project over time
- **CocoMeter** — Token and cost tracking per session and phase
- **Safety Gate** — SQL intercept layer with strict/normal/off modes for production schema protection

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
/pod init       — initialize CocoPlus in your project
/cocoplus on    — activate all features
/spec           — start the requirements phase
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