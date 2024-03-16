use {
    crate::ecosystems::{
        algorand::{AlgorandAddress, AlgorandMessage},
        ed25519::{Ed25519Pubkey, Ed25519TestMessage},
        get_expected_payload,
    },
    anchor_lang::{prelude::Pubkey, AnchorDeserialize, AnchorSerialize},
    solana_program_test::tokio,
};

#[tokio::test]
pub async fn test_algorand_message() {
    let claimant = Pubkey::new_unique();
    assert_eq!(
        AlgorandMessage::parse(&AlgorandMessage::for_claimant(&claimant).get_message_with_metadata())
            .unwrap()
            .get_payload(),
        get_expected_payload(&claimant).as_bytes()
    );
}


#[tokio::test]
pub async fn ed25519_key_to_algorand_address() {
    let key = Ed25519Pubkey::try_from_slice(&hex::decode("4cb5abf6ad79fbf5abbccafcc269d85cd2651ed4b885b5869f241aedf0a5ba29").unwrap()).unwrap();
    let address = AlgorandAddress::from(key);
    let mut address_bytes = vec![];
    address.serialize(&mut address_bytes);
    assert_eq!("4cb5abf6ad79fbf5abbccafcc269d85cd2651ed4b885b5869f241aedf0a5ba298506d215", hex::encode(address_bytes))
}