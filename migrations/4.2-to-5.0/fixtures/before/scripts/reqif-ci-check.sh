#!/bin/sh
# Example adopter automation predating the 5.0.0 lifecycle-command removal.
set -e
transitrix-reqif validate reqif/
transitrix-reqif transition reqif/ so-print-retry-req-1 approved
