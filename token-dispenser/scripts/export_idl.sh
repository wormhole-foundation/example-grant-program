#! /bin/bash

# This script updates the IDL generated by anchor and copies it into the frontend
cat target/idl/token_dispenser.json |
# ADD UNIT STRUCTS
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "EvmPubkey")).type |= {"array": ["u8", 20]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "Secp256k1Signature")).type |= {"array": ["u8", 64]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "UncompressedSecp256k1Pubkey")).type |= {"array": ["u8", 65]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "CosmosBech32Address")).type |= "string"' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "Ed25519Pubkey")).type |= {"array": ["u8", 32]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "Ed25519Signature")).type |= {"array": ["u8", 64]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "SuiAddress")).type |= {"array": ["u8", 32]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "AptosAddress")).type |= {"array": ["u8", 32]}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "AlgorandAddress")).type |= {"array": ["u8", 36]}' |
# ADD EXTERNAL STRUCTS
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "MerklePath<SolanaHasher>")).type |= {"vec":{"array":["u8",20]}}' |
jq '(..|objects| select(.type? and .type.defined? and .type.defined == "MerkleRoot<SolanaHasher>")).type |= {"array": ["u8", 20]}' |
# DELETE TEST STRUCTS
jq '.types |= map(select(.name != "TestIdentityCertificate"))' > ../frontend/claim_sdk/idl/token_dispenser.json


generate_declaration_file() {
    PROGRAM_SO=$1
    OUT_DIR=$2

    prog="$(basename $PROGRAM_SO .json)"
    OUT_PATH="$OUT_DIR/$prog.ts"
    PREFIX=$(echo $prog | gsed -E 's/(^|_)([a-z])/\U\2/g')
    typename="${PREFIX}"

    # types
    echo "export type $typename =" >$OUT_PATH
    cat $PROGRAM_SO >>$OUT_PATH
    echo ";" >>$OUT_PATH


    # raw json
    echo "export const IDL: $typename =" >>$OUT_PATH
    cat $PROGRAM_SO >>$OUT_PATH
    echo ";" >>$OUT_PATH

}

generate_declaration_file ../frontend/claim_sdk/idl/token_dispenser.json ../frontend/claim_sdk/idl
