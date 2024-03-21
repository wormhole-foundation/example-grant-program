#[cfg(test)]
use super::{
    ed25519::Ed25519TestMessage,
    get_expected_payload,
};
use {
    //super::ed25519::Ed25519Pubkey,
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        AnchorDeserialize,
        AnchorSerialize,
    },
};

pub const ALGORAND_PREFIX: &[u8] = b"MX";

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AlgorandMessage(Vec<u8>);

impl AlgorandMessage {
    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }

    pub fn parse(data: &[u8]) -> Result<Self> {
        if let Some(payload) = data.strip_prefix(ALGORAND_PREFIX) {
            return Ok(AlgorandMessage(payload.to_vec()));
        }
        Err(ErrorCode::SignatureVerificationWrongPayloadMetadata.into())
    }
}

#[cfg(test)]
impl Ed25519TestMessage for AlgorandMessage {
    fn for_claimant(claimant: &Pubkey) -> Self {
        Self(get_expected_payload(claimant).into_bytes())
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        let mut message = ALGORAND_PREFIX.to_vec();
        message.extend_from_slice(&self.0);
        message.to_vec()
    }
}
