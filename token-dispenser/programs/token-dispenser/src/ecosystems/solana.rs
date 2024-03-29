#[cfg(test)]
use super::{
    ed25519::Ed25519TestMessage,
    get_expected_payload,
};
use {
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        AnchorDeserialize,
        AnchorSerialize,
    },
};

//Solana CLI off-chain message signing example:
// $> solana sign-offchain-message testmessage
//
// public key:
//   EW8XHqffXwryUnRCdtWY2P85a3QEACMZuh8R8PumG4uM
//   as hex: c89e476874977dcaca32f66ffab10d4a5a89b6ae5a31ae68caf91d7967d25fe0
//
// signature:
//   4gfuYetd6g7ktB8i6LVVziyKjnFC85fabTHVD9CV5tREoHvZMQxBvdNQcBB1wnUqe1e1HZ9CMaVqreNdWxhaGuvD
//   as hex: b842f6f3ab7f0bf38abc3d0d822002c32e693e8fff7290952f7c0755d6f8a050bb8f35f66b7eeaecb16c4d441174d2794dc2866ce27b1da574d7d870e37d5a06
//
// testmessage + header:
// \xffsolana offchain<1 byte version=0><1 byte format=0 (=restricted ascii)><2 byte length (little endian)>:
//   \xffsolana offchain\x00\x00\x0b\x00testmessage
//   as hex: FF736F6C616E61206F6666636861696E00000B00746573746D657373616765
//
// verify here:
//   https://cyphr.me/ed25519_tool/ed.html
//
// links for reference:
//   https://docs.solanalabs.com/cli/examples/sign-offchain-message#protocol-specification
//   https://github.com/solana-labs/solana/blob/master/docs/src/proposals/off-chain-message-signing.md#message-format
//   https://github.com/solana-labs/solana/blob/master/sdk/src/offchain_message.rs
pub const SOLANA_PREFIX: &[u8] = b"\xffsolana offline\0\0";

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct SolanaMessage(Vec<u8>);

impl SolanaMessage {
    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }

    pub fn parse(data: &[u8]) -> Result<Self> {
        if let Some(payload) = data.strip_prefix(SOLANA_PREFIX) {
            if payload.len() >= 2 {
                let length = u16::from_le_bytes([payload[0], payload[1]]) as usize;
                let message = &payload[2..];
                if length == message.len() {
                    return Ok(SolanaMessage(message.to_vec()));
                }
            }
        }
        Err(ErrorCode::SignatureVerificationWrongPayloadMetadata.into())
    }
}

#[cfg(test)]
impl Ed25519TestMessage for SolanaMessage {
    fn for_claimant(claimant: &Pubkey) -> Self {
        Self(get_expected_payload(claimant).into_bytes())
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        let mut message = SOLANA_PREFIX.to_vec();
        let length = self.0.len() as u16;
        message.extend_from_slice(&length.to_le_bytes());
        message.extend_from_slice(&self.0);
        message.to_vec()
    }
}
