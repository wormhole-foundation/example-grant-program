#[cfg(test)]
use super::{
    ed25519::Ed25519TestMessage,
    get_expected_payload,
};
use {
    std::io::Read,
    super::ed25519::Ed25519Pubkey,
    crate::ErrorCode,
    anchor_lang::{
        prelude::*,
        AnchorDeserialize,
        AnchorSerialize,
    },
    sha2::Digest,
};

pub const ALGORAND_MESSAGE_PREFIX: &[u8] = b"MX";

/**
 * An Algorand signed message.
 * When a browser wallet signs a message, it prepends the payload with a prefix
 * The message is ("MX" + payload).
 * This struct represents the prefixed message and helps with creating and verifying it.
 */

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AlgorandMessage(Vec<u8>);

impl AlgorandMessage {
    pub fn parse(data: &[u8]) -> Result<Self> {
        if let Some(payload) = data.strip_prefix(ALGORAND_MESSAGE_PREFIX) {
            return Ok(AlgorandMessage(payload.to_vec()));
        }
        Err(ErrorCode::SignatureVerificationWrongPayloadMetadata.into())
    }

    pub fn get_payload(&self) -> &[u8] {
        self.0.as_slice()
    }
}

#[cfg(test)]
impl Ed25519TestMessage for AlgorandMessage {
    fn for_claimant(claimant: &Pubkey) -> Self {
        Self(get_expected_payload(claimant).into_bytes())
    }

    fn get_message_with_metadata(&self) -> Vec<u8> {
        let mut message = ALGORAND_MESSAGE_PREFIX.to_vec();
        message.extend_from_slice(&self.0);
        message.to_vec()
    }
}

#[derive(Clone)]
pub struct AlgorandAddress([u8; Self::LEN]);

impl AnchorSerialize for AlgorandAddress {
    fn serialize<W: std::io::prelude::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        writer.write_all(&self.0)
    }
}

impl AnchorDeserialize for AlgorandAddress {
    fn deserialize(buf: &mut &[u8]) -> std::io::Result<Self> {
        let mut address = [0u8;36];
        buf.read_exact(&mut address)?;
        Ok(AlgorandAddress(address))
    }
}

impl AlgorandAddress {
    pub const LEN: usize = 36;
}

/* 

If we need to know that an address came from a public key, Sha512/256 hashing is required. 
If we only need to know that a public key comes from an address, we can omit hashing and just take the first 32 bytes of the address because an Algorand address is just a 32 byte ed25519 pubkey with a 4 byte checksum at the end.

*/

impl From<Ed25519Pubkey> for AlgorandAddress {
    fn from(val: Ed25519Pubkey) -> Self {
        let mut hasher = sha2::Sha512_256::new();
        hasher.update(val.to_bytes());
        let checksum: [u8;32] = hasher.finalize().try_into().unwrap();
        let mut algorand_addr = [0u8; Self::LEN];
        algorand_addr[..32].clone_from_slice(&val.to_bytes());
        algorand_addr[32..].clone_from_slice(&checksum[28..]);
        AlgorandAddress(algorand_addr)
    }
}

#[cfg(test)]
impl From<[u8; Self::LEN]> for AlgorandAddress {
    fn from(bytes: [u8; Self::LEN]) -> Self {
        AlgorandAddress(bytes)
    }
}