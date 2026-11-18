/** English wording, one file per area. Every key here must also exist in ../mn. */

import { ai } from "./ai";
import { common } from "./common";
import { draft } from "./draft";
import { errors } from "./errors";
import { history } from "./history";
import { live } from "./live";
import { match } from "./match";
import { shell } from "./shell";
import { stats } from "./stats";
import { suggest } from "./suggest";
import { trending } from "./trending";

export const en = { common, shell, stats, suggest, history, match, draft, live, ai, trending, errors };
