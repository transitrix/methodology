# DSM demo seed — staged, not a permanent home

`dsm-demo-seed.sql` populates a running [DSM](https://github.com/transitrix/transitrix-dsm) instance with the `acme-corp` worked example's DGCA chain (Driver → Goal → Change → Action), for demo and development purposes.

**Why it's here and not in `acme-corp`:** this is internal demo/dev tooling for the DSM product, not something the company Acme Corp itself would hold — it doesn't belong in an adopter repo. It moved out of `acme-corp/tools/` (HUB-804, vkgeorgia/strategy#862).

**Why it's here and not in `transitrix-dsm`:** methodology has no write access into `transitrix-dsm`, and no demo-tooling home has been designated there yet. This `integration/` folder is the closest existing "how methodology connects to other Transitrix tools" home in this repo — staged here until the DSM or Coordinator agent gives it a permanent location (most likely somewhere under `transitrix-dsm`'s own tooling).

**How:**

```bash
psql "$DATABASE_DSN" -f integration/dsm-demo-seed/dsm-demo-seed.sql
```

Requires the DSM schema already applied and at least one organization + active scenario present. The script is idempotent — safe to re-run.

**Future direction:** this seed will be generated from the acme-corp YAML notations directly once the DSM text-repo ingest pipeline (T9 serializer) is in place. Until then the SQL is maintained by hand alongside the canon YAML.
