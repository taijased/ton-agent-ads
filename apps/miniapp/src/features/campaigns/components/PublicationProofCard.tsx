interface PublicationProofCardProps {
  txHash: string | null;
  proofText: string | null;
  proofReceivedAt: string | null;
  dealStatus: string;
}

export const PublicationProofCard = ({
  txHash,
  proofText,
  proofReceivedAt,
  dealStatus,
}: PublicationProofCardProps) => {
  if (
    dealStatus !== "paid" &&
    dealStatus !== "proof_pending" &&
    dealStatus !== "completed"
  ) {
    return null;
  }

  return (
    <div className="approval-card">
      <div className="approval-card__header">
        {dealStatus === "completed"
          ? "Publication Complete"
          : "Post-Payment Status"}
      </div>
      <div className="approval-card__details">
        {/* Payment confirmation */}
        <div className="approval-card__detail">
          <span className="approval-card__detail-label">Payment</span>
          <span className="approval-card__detail-value">Confirmed</span>
        </div>

        {/* Transaction hash with explorer link */}
        {txHash !== null ? (
          <div className="approval-card__detail">
            <span className="approval-card__detail-label">Transaction</span>
            <span className="approval-card__detail-value">
              <a
                href={`https://testnet.tonviewer.com/transaction/${encodeURIComponent(txHash)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="approval-card__link"
              >
                {txHash.length > 16
                  ? `${txHash.slice(0, 8)}...${txHash.slice(-8)}`
                  : txHash}
              </a>
            </span>
          </div>
        ) : null}

        {/* Status indicator */}
        <div className="approval-card__detail">
          <span className="approval-card__detail-label">Publication</span>
          <span className="approval-card__detail-value">
            {dealStatus === "completed"
              ? "Published"
              : dealStatus === "proof_pending"
                ? "Reminder sent, waiting for proof..."
                : "Waiting for publication..."}
          </span>
        </div>

        {/* Proof text (forwarded post) */}
        {dealStatus === "completed" && proofText !== null ? (
          <div className="approval-card__detail approval-card__detail--column">
            <span className="approval-card__detail-label">Published Post</span>
            <span className="approval-card__detail-value approval-card__detail-value--pre">
              {proofText}
            </span>
          </div>
        ) : null}

        {/* Completion time */}
        {dealStatus === "completed" && proofReceivedAt !== null ? (
          <div className="approval-card__detail">
            <span className="approval-card__detail-label">Confirmed at</span>
            <span className="approval-card__detail-value">
              {new Date(proofReceivedAt).toLocaleString()}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
