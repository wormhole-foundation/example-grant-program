#!/bin/bash
set -euxo pipefail
command -v shellcheck >/dev/null && shellcheck "$0"

# initialize variables
dev=0
test=0
verbose=0

DIR=$(cd "$(dirname "$0")" && pwd)
TOKEN_DISPENSER_DIR="$DIR/../../token-dispenser";


usage() {
  cat <<EOF
  Usage: $0 -d[--dev]|-t[--test]|-c[--csv] -v[--verbose] -h[--help]
  where:
    -d | --dev  : start up test validator, deploy programs
    -t | --test : run tests
    -h | --help : print this usage message

  -d and -t are mutually exclusive
EOF
}

# parse flags
for i in "$@"
do
case $i in
    -d|--dev)
    if [ "$test" -eq 1 ] || [ "$csv" -eq 1 ]; then
      usage
      exit
    else
      dev=1
    fi
    shift
    ;;
    -t|--test)
    if [ "$dev" -eq 1 ]; then
      usage
      exit
    else
      test=1
    fi
    shift
    ;;
    -v|--verbose)
    verbose=1
    shift
    ;;
    -h|--help)
    usage
    exit 0
    ;;
    *)
    # unknown option
    ;;
esac
done

if [ "$dev" -eq 0 ] && [ "$test" -eq 0 ] && [ "$csv" -eq 0 ]; then
  printf "No mode selected. Please select either -d[--dev] or -t[--test] or -c[--csv]\n\n"
  usage
  exit 1
fi

function build_program() {
  cd "$TOKEN_DISPENSER_DIR";
  anchor run export;
}

function run_integration_tests() {
  cd "$DIR";
  npm run test;
}

function start_anchor_localnet() {
  cd "$TOKEN_DISPENSER_DIR";
  anchor localnet;
}

function stop_anchor_localnet() {
  solana_pid=$(pgrep -f '[s]olana-test-validator' || true)
  if [ -n "$solana_pid" ]; then
    echo "killing solana-test-validator with pid: $solana_pid"
    kill -9 "$solana_pid"
    pgrep -f 'solana-test-validator' | xargs kill -9
  else
    echo "No solana-test-validator process found to stop"
  fi
}

function cleanup() {
  if [ "$verbose" -eq 1 ]; then
      echo "shutting down solana-test-validator if running"
  fi
  stop_anchor_localnet;
}

function main() {
  # run clean up in case of failures from previous run
  cleanup;
  # start solana-test-validator
  build_program;
  start_anchor_localnet &
  sleep 5
  if [ "$dev" -eq 1 ]; then
      if [ "$verbose" -eq 1 ]; then
        echo "dev mode"
        echo "populate db and deploy and initialize program"
      fi
      printf "\n\n**Running solana-test-validator until CTRL+C detected**\n\n"
      # wait for ctrl-c
      ( trap exit SIGINT ; read -r -d '' _ </dev/tty )
  elif [ "$test" -eq 1 ]; then
    if [ "$verbose" -eq 1 ]; then
        echo "test mode"
        echo "running frontend tests"
      fi
      run_integration_tests;
  else
      echo "no mode selected"
      usage;
  fi
  cleanup;
}

main
