"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signIn, signOut, getCsrfToken } from "next-auth/react";
import sdk, { SignIn as SignInCore } from "@farcaster/frame-sdk";
import {
  useAccount,
  useSendTransaction,
  useSignMessage,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useDisconnect,
  useConnect,
  useSwitchChain,
  useChainId,
} from "wagmi";
import {
  useConnection as useSolanaConnection,
  useWallet as useSolanaWallet,
} from "@solana/wallet-adapter-react";
import { useHasSolanaProvider } from "./providers/SafeFarcasterSolanaProvider";

import { config } from "~/components/providers/WagmiProvider";
import { Button } from "~/components/ui/Button";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, degen, mainnet, optimism, unichain } from "wagmi/chains";
import { BaseError, UserRejectedRequestError } from "viem";
import { useSession } from "next-auth/react";
import { useFrame } from "~/components/providers/FrameProvider";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { submitFarfession, canUserSubmitToday } from "~/lib/supabase";
import FarfessionFeed from "./FarfessionFeed";

// Payment constants
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
const FARFESSIONS_WALLET = "0x3c9ca97168abd573cbc9605a47996abae1885d60"; // You'll need to provide your farfessions wallet address
const PAYMENT_AMOUNT = "500000"; // $0.50 in USDC (6 decimals)

export default function Farfessions(
  { title }: { title?: string } = { title: "Frames v2 Demo" }
) {
  const {
    isSDKLoaded,
    context,
    added,
    notificationDetails,
    lastEvent,
    addFrame,
    addFrameResult,
    openUrl,
    close,
  } = useFrame();
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sendNotificationResult, setSendNotificationResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [farfession, setFarfession] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmitToday, setCanSubmitToday] = useState<boolean | null>(null);
  const [checkingSubmissionLimit, setCheckingSubmissionLimit] = useState(false);
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const hasSolanaProvider = useHasSolanaProvider();

  // Initialize Solana wallet variables only if provider exists
  let solanaWallet, solanaPublicKey, solanaSignMessage, solanaAddress;
  if (hasSolanaProvider) {
    try {
      solanaWallet = useSolanaWallet();
      // Check if the wallet is actually connected before destructuring
      if (solanaWallet && solanaWallet.publicKey && solanaWallet.signMessage) {
        ({ publicKey: solanaPublicKey, signMessage: solanaSignMessage } =
          solanaWallet);
        solanaAddress = solanaPublicKey?.toBase58();
      }
    } catch (error) {
      console.log("Solana wallet not ready yet:", error);
    }
  }

  useEffect(() => {
    console.log("isSDKLoaded", isSDKLoaded);
    console.log("context", context);
    console.log("address", address);
    console.log("isConnected", isConnected);
    console.log("chainId", chainId);
  }, [context, address, isConnected, chainId, isSDKLoaded]);

  const {
    sendTransaction,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

  const {
    signTypedData,
    error: signTypedError,
    isError: isSignTypedError,
    isPending: isSignTypedPending,
  } = useSignTypedData();

  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  const {
    switchChain,
    error: switchChainError,
    isError: isSwitchChainError,
    isPending: isSwitchChainPending,
  } = useSwitchChain();

  const nextChain = useMemo(() => {
    if (chainId === base.id) {
      return optimism;
    } else if (chainId === optimism.id) {
      return degen;
    } else if (chainId === degen.id) {
      return mainnet;
    } else if (chainId === mainnet.id) {
      return unichain;
    } else {
      return base;
    }
  }, [chainId]);

  const handleSwitchChain = useCallback(() => {
    switchChain({ chainId: nextChain.id });
  }, [switchChain, nextChain.id]);

  const sendNotification = useCallback(async () => {
    setSendNotificationResult("");
    if (!notificationDetails || !context) {
      return;
    }

    try {
      const response = await fetch("/api/send-notification", {
        method: "POST",
        mode: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context.user.fid,
          notificationDetails,
        }),
      });

      if (response.status === 200) {
        setSendNotificationResult("Success");
        return;
      } else if (response.status === 429) {
        setSendNotificationResult("Rate limited");
        return;
      }

      const data = await response.text();
      setSendNotificationResult(`Error: ${data}`);
    } catch (error) {
      setSendNotificationResult(`Error: ${error}`);
    }
  }, [context, notificationDetails]);

  const sendTx = useCallback(() => {
    sendTransaction(
      {
        // call yoink() on Yoink contract
        to: "0x4bBFD120d9f352A0BEd7a014bd67913a2007a878",
        data: "0x9846cd9efc000023c0",
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
        },
      }
    );
  }, [sendTransaction]);

  const signTyped = useCallback(() => {
    signTypedData({
      domain: {
        name: "Frames v2 Demo",
        version: "1",
        chainId,
      },
      types: {
        Message: [{ name: "content", type: "string" }],
      },
      message: {
        content: "Hello from Frames v2!",
      },
      primaryType: "Message",
    });
  }, [chainId, signTypedData]);

  const toggleContext = useCallback(() => {
    setIsContextOpen((prev) => !prev);
  }, []);

  // Check daily submission limit when user FID changes
  useEffect(() => {
    const checkDailyLimit = async () => {
      const userFid = context?.user?.fid;
      if (userFid) {
        setCheckingSubmissionLimit(true);
        try {
          const canSubmit = await canUserSubmitToday(userFid);
          setCanSubmitToday(canSubmit);
        } catch (error) {
          console.error("Error checking daily submission limit:", error);
          setCanSubmitToday(true); // Default to allowing submission if check fails
        } finally {
          setCheckingSubmissionLimit(false);
        }
      } else {
        setCanSubmitToday(true); // Allow anonymous submissions
      }
    };

    checkDailyLimit();
  }, [context?.user?.fid]);

  const handleSubmitFarfession = async () => {
    if (!farfession.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Get FID from context if available, otherwise use undefined
      const userFid = context?.user?.fid;

      await submitFarfession(farfession, userFid);
      setFarfession(""); // Clear the input after submission

      // Update daily submission status
      if (userFid) {
        const ADMIN_FID = 212074;
        if (userFid !== ADMIN_FID) {
          setCanSubmitToday(false); // Regular users can't submit again today
        }
      }

      alert("Your Farfession has been submitted!"); // Using alert since toast might not be installed
    } catch (error) {
      console.error("Error submitting farfession:", error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("already submitted a farfession today")) {
          alert(
            "You have already submitted a farfession today. Please wait until tomorrow to submit another one."
          );
          setCanSubmitToday(false);
        } else if (error.message.includes("Supabase is not configured")) {
          alert(
            "Database not configured. Please check your environment variables in .env.local file."
          );
        } else if (error.message.includes("Database error")) {
          alert(`Database error: ${error.message}`);
        } else {
          alert(`Error: ${error.message}`);
        }
      } else {
        alert(
          "Failed to submit your Farfession. Please check the console for details."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayToPost = useCallback(async () => {
    if (!farfession.trim()) {
      alert("Please enter a farfession first");
      return;
    }

    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (chainId !== base.id) {
      alert("Please switch to Base network to make payment");
      return;
    }

    setIsPaymentPending(true);

    try {
      // Send USDC payment
      sendTransaction(
        {
          to: USDC_CONTRACT_ADDRESS,
          data: `0xa9059cbb${FARFESSIONS_WALLET.slice(2).padStart(
            64,
            "0"
          )}${PAYMENT_AMOUNT.padStart(64, "0")}`, // transfer(address,uint256)
        },
        {
          onSuccess: (hash) => {
            setPaymentTxHash(hash);
            alert(
              "Payment sent! Your farfession will be posted once payment is confirmed."
            );
          },
          onError: (error) => {
            console.error("Payment failed:", error);
            alert("Payment failed. Please try again.");
          },
        }
      );
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setIsPaymentPending(false);
    }
  }, [farfession, isConnected, chainId, sendTransaction]);

  // Watch for payment confirmation
  const { isLoading: isPaymentConfirming, isSuccess: isPaymentConfirmed } =
    useWaitForTransactionReceipt({
      hash: paymentTxHash as `0x${string}`,
    });

  useEffect(() => {
    if (isPaymentConfirmed && paymentTxHash && farfession.trim()) {
      handleProcessPayment();
    }
  }, [isPaymentConfirmed, paymentTxHash, farfession]);

  const handleProcessPayment = async () => {
    setIsProcessingPayment(true);

    try {
      // Submit to database and post to Farcaster
      const response = await fetch("/api/pay-to-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: farfession,
          userFid: context?.user?.fid,
          paymentTxHash,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process payment");
      }

      const result = await response.json();

      setFarfession(""); // Clear the input
      setPaymentTxHash(null);
      alert(`Your farfession has been posted! Cast hash: ${result.castHash}`);
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Payment confirmed but posting failed. Please contact support.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2 text-white">
        <h1 className="text-2xl font-bold text-center mb-4">{title}</h1>

        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Farfessions</h2>

          {/* Daily submission status */}
          {context?.user?.fid && (
            <div className="mb-2 text-xs">
              {checkingSubmissionLimit ? (
                <span className="text-gray-300">
                  Checking submission limit...
                </span>
              ) : canSubmitToday === false ? (
                <span className="text-yellow-400">
                  ⚠️ You have already submitted today. Next submission available
                  tomorrow.
                  {context.user.fid === 212074 && (
                    <span className="text-green-400 ml-1">
                      (Admin: unlimited submissions)
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-green-400">
                  ✅ You can submit a farfession today
                  {context.user.fid === 212074 && (
                    <span className="ml-1">(Admin: unlimited submissions)</span>
                  )}
                </span>
              )}
            </div>
          )}

          <textarea
            className="w-full p-2 border border-gray-300 rounded-md mb-2 text-[#333333] bg-white"
            rows={4}
            placeholder="What is your secret Farfession?"
            value={farfession}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 1000) {
                setFarfession(value);
              }
            }}
            disabled={isSubmitting || checkingSubmissionLimit}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mb-2">
            <div
              className={`text-xs ${
                farfession.length > 900
                  ? farfession.length >= 1000
                    ? "text-red-400"
                    : "text-yellow-400"
                  : "text-gray-300"
              }`}
            >
              {farfession.length}/1000 characters
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleSubmitFarfession}
              disabled={
                isSubmitting ||
                checkingSubmissionLimit ||
                !farfession.trim() ||
                farfession.length > 1000 ||
                (canSubmitToday === false && context?.user?.fid !== 212074)
              }
              isLoading={isSubmitting}
            >
              {checkingSubmissionLimit ? "Checking..." : "Submit"}
            </Button>

            <Button
              className="flex-1"
              onClick={handlePayToPost}
              disabled={
                isPaymentPending ||
                isProcessingPayment ||
                !farfession.trim() ||
                farfession.length > 1000 ||
                !isConnected ||
                chainId !== base.id
              }
              isLoading={isPaymentPending || isProcessingPayment}
            >
              {isPaymentPending
                ? "Sending..."
                : isProcessingPayment
                  ? "Posting..."
                  : "Pay to Cast ($0.50)"}
            </Button>
          </div>

          {/* Payment status */}
          {paymentTxHash && (
            <div className="mt-2 text-xs text-green-400">
              Payment sent!{" "}
              {isPaymentConfirming ? "Confirming..." : "Confirmed ✓"}
            </div>
          )}
        </div>

        <FarfessionFeed />

        <div>
          <h2 className="font-2xl font-bold">Actions</h2>

          <div className="mb-4">
            <div className="p-2 bg-[#7252B8] rounded-lg my-2">
              <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x- text-white">
                sdk.actions.signIn
              </pre>
            </div>
            <SignIn />
          </div>

          <div className="mb-4">
            <div className="p-2 bg-[#7252B8] rounded-lg my-2">
              <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x- text-white">
                sdk.actions.close
              </pre>
            </div>
            <Button onClick={close}>Close Frame</Button>
          </div>
        </div>

        <div>
          <h2 className="font-2xl font-bold">Add to client & notifications</h2>

          <div className="mt-2 mb-4 text-sm">
            Client fid {context?.client.clientFid},
            {added ? " frame added to client," : " frame not added to client,"}
            {notificationDetails
              ? " notifications enabled"
              : " notifications disabled"}
          </div>

          <div className="mb-4">
            <div className="p-2 bg-[#7252B8] rounded-lg my-2">
              <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x- text-white">
                sdk.actions.addFrame
              </pre>
            </div>
            {addFrameResult && (
              <div className="mb-2 text-sm">
                Add frame result: {addFrameResult}
              </div>
            )}
            <Button onClick={addFrame} disabled={added}>
              Add frame to client
            </Button>
          </div>

          {sendNotificationResult && (
            <div className="mb-2 text-sm">
              Send notification result: {sendNotificationResult}
            </div>
          )}
          <div className="mb-4">
            <Button onClick={sendNotification} disabled={!notificationDetails}>
              Send notification
            </Button>
          </div>

          <div className="mb-4">
            <Button
              onClick={async () => {
                if (context?.user?.fid) {
                  const shareUrl = `${process.env.NEXT_PUBLIC_URL}/share/${context.user.fid}`;
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              disabled={!context?.user?.fid}
            >
              {copied ? "Copied!" : "Copy share URL"}
            </Button>
          </div>
        </div>

        <div>
          <h2 className="font-2xl font-bold">Wallet</h2>

          {address && (
            <div className="my-2 text-xs">
              Address: <pre className="inline">{truncateAddress(address)}</pre>
            </div>
          )}

          {chainId && (
            <div className="my-2 text-xs">
              Chain ID: <pre className="inline">{chainId}</pre>
            </div>
          )}

          <div className="mb-4">
            {isConnected ? (
              <Button onClick={() => disconnect()} className="w-full">
                Disconnect
              </Button>
            ) : context ? (
              /* if context is not null, mini app is running in frame client */
              <Button
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full"
              >
                Connect
              </Button>
            ) : (
              /* if context is null, mini app is running in browser */
              <div className="space-y-2">
                <Button
                  onClick={() => connect({ connector: connectors[1] })}
                  className="w-full"
                >
                  Connect Coinbase Wallet
                </Button>
                <Button
                  onClick={() => connect({ connector: connectors[2] })}
                  className="w-full"
                >
                  Connect MetaMask
                </Button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <SignEvmMessage />
          </div>

          {isConnected && (
            <>
              <div className="mb-4">
                <Button
                  onClick={sendTx}
                  disabled={!isConnected || isSendTxPending}
                  isLoading={isSendTxPending}
                >
                  Send Transaction (contract)
                </Button>
                {isSendTxError && renderError(sendTxError)}
                {txHash && (
                  <div className="mt-2 text-xs">
                    <div>Hash: {truncateAddress(txHash)}</div>
                    <div>
                      Status:{" "}
                      {isConfirming
                        ? "Confirming..."
                        : isConfirmed
                          ? "Confirmed!"
                          : "Pending"}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Solana functions inspired by farcaster demo
// https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/components/Farfessions.tsx
function SignSolanaMessage({
  signMessage,
}: {
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}) {
  const [signature, setSignature] = useState<string | undefined>();
  const [signError, setSignError] = useState<Error | undefined>();
  const [signPending, setSignPending] = useState(false);

  const handleSignMessage = useCallback(async () => {
    setSignPending(true);
    try {
      if (!signMessage) {
        throw new Error(
          "No Solana signMessage function available. Please connect a Solana wallet."
        );
      }
      const input = new TextEncoder().encode("Hello from Solana!");
      const signatureBytes = await signMessage(input);
      const signature = btoa(String.fromCharCode(...signatureBytes));
      setSignature(signature);
      setSignError(undefined);
    } catch (e) {
      if (e instanceof Error) {
        setSignError(e);
        console.log("Solana sign message error:", e.message);
      }
    } finally {
      setSignPending(false);
    }
  }, [signMessage]);

  return (
    <>
      <Button
        onClick={handleSignMessage}
        disabled={signPending || !signMessage}
        isLoading={signPending}
        className="mb-4"
      >
        Sign Message
      </Button>
      {signError && renderError(signError)}
      {signature && (
        <div className="mt-2 text-xs">
          <div>Signature: {signature}</div>
        </div>
      )}
    </>
  );
}

function SendSolana() {
  const [state, setState] = useState<
    | { status: "none" }
    | { status: "pending" }
    | { status: "error"; error: Error }
    | { status: "success"; signature: string }
  >({ status: "none" });

  const { connection: solanaConnection } = useSolanaConnection();
  const { sendTransaction, publicKey } = useSolanaWallet();

  // This should be replaced but including it from the original demo
  // https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/components/Farfessions.tsx#L718
  const ashoatsPhantomSolanaWallet =
    "Ao3gLNZAsbrmnusWVqQCPMrcqNi6jdYgu8T6NCoXXQu1";

  const handleSend = useCallback(async () => {
    setState({ status: "pending" });
    try {
      if (!publicKey) {
        throw new Error(
          "No Solana publicKey available. Please connect a Solana wallet."
        );
      }

      if (!sendTransaction) {
        throw new Error("No Solana sendTransaction function available.");
      }

      if (!solanaConnection) {
        throw new Error("No Solana connection available.");
      }

      const { blockhash } = await solanaConnection.getLatestBlockhash();
      if (!blockhash) {
        throw new Error("Failed to fetch latest Solana blockhash");
      }

      const fromPubkeyStr = publicKey.toBase58();
      const toPubkeyStr = ashoatsPhantomSolanaWallet;
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(fromPubkeyStr),
          toPubkey: new PublicKey(toPubkeyStr),
          lamports: 0n,
        })
      );
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(fromPubkeyStr);

      const simulation =
        await solanaConnection.simulateTransaction(transaction);
      if (simulation.value.err) {
        // Gather logs and error details for debugging
        const logs = simulation.value.logs?.join("\n") ?? "No logs";
        const errDetail = JSON.stringify(simulation.value.err);
        throw new Error(`Simulation failed: ${errDetail}\nLogs:\n${logs}`);
      }
      const signature = await sendTransaction(transaction, solanaConnection);
      setState({ status: "success", signature });
    } catch (e) {
      if (e instanceof Error) {
        setState({ status: "error", error: e });
        console.log("Solana send transaction error:", e.message);
      } else {
        setState({ status: "none" });
      }
    }
  }, [sendTransaction, publicKey, solanaConnection]);

  return (
    <>
      <Button
        onClick={handleSend}
        disabled={state.status === "pending" || !publicKey || !sendTransaction}
        isLoading={state.status === "pending"}
        className="mb-4"
      >
        Send Transaction (sol)
      </Button>
      {state.status === "error" && renderError(state.error)}
      {state.status === "success" && (
        <div className="mt-2 text-xs">
          <div>Hash: {truncateAddress(state.signature)}</div>
        </div>
      )}
    </>
  );
}

function SignEvmMessage() {
  const { isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const {
    signMessage,
    data: signature,
    error: signError,
    isError: isSignError,
    isPending: isSignPending,
  } = useSignMessage();

  const handleSignMessage = useCallback(async () => {
    if (!isConnected) {
      await connectAsync({
        chainId: base.id,
        connector: config.connectors[0],
      });
    }

    signMessage({ message: "Hello from Frames v2!" });
  }, [connectAsync, isConnected, signMessage]);

  return (
    <>
      <Button
        onClick={handleSignMessage}
        disabled={isSignPending}
        isLoading={isSignPending}
      >
        Sign Message
      </Button>
      {isSignError && renderError(signError)}
      {signature && (
        <div className="mt-2 text-xs">
          <div>Signature: {signature}</div>
        </div>
      )}
    </>
  );
}

function SendEth() {
  const { isConnected, chainId } = useAccount();
  const {
    sendTransaction,
    data,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: data,
    });

  const toAddr = useMemo(() => {
    // Protocol guild address
    return chainId === base.id
      ? "0x32e3C7fD24e175701A35c224f2238d18439C7dBC"
      : "0xB3d8d7887693a9852734b4D25e9C0Bb35Ba8a830";
  }, [chainId]);

  const handleSend = useCallback(() => {
    sendTransaction({
      to: toAddr,
      value: 1n,
    });
  }, [toAddr, sendTransaction]);

  return (
    <>
      <Button
        onClick={handleSend}
        disabled={!isConnected || isSendTxPending}
        isLoading={isSendTxPending}
      >
        Send Transaction (eth)
      </Button>
      {isSendTxError && renderError(sendTxError)}
      {data && (
        <div className="mt-2 text-xs">
          <div>Hash: {truncateAddress(data)}</div>
          <div>
            Status:{" "}
            {isConfirming
              ? "Confirming..."
              : isConfirmed
                ? "Confirmed!"
                : "Pending"}
          </div>
        </div>
      )}
    </>
  );
}

function SignIn() {
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signInResult, setSignInResult] = useState<SignInCore.SignInResult>();
  const [signInFailure, setSignInFailure] = useState<string>();
  const { data: session, status } = useSession();

  const getNonce = useCallback(async () => {
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Unable to generate nonce");
    return nonce;
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      setSigningIn(true);
      setSignInFailure(undefined);
      const nonce = await getNonce();
      const result = await sdk.actions.signIn({ nonce });
      setSignInResult(result);

      await signIn("credentials", {
        message: result.message,
        signature: result.signature,
        redirect: false,
      });
    } catch (e) {
      if (e instanceof SignInCore.RejectedByUser) {
        setSignInFailure("Rejected by user");
        return;
      }

      setSignInFailure("Unknown error");
    } finally {
      setSigningIn(false);
    }
  }, [getNonce]);

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true);
      await signOut({ redirect: false });
      setSignInResult(undefined);
    } finally {
      setSigningOut(false);
    }
  }, []);

  return (
    <>
      {status !== "authenticated" && (
        <Button onClick={handleSignIn} disabled={signingIn}>
          Sign In with Farcaster
        </Button>
      )}
      {status === "authenticated" && (
        <Button onClick={handleSignOut} disabled={signingOut}>
          Sign out
        </Button>
      )}
      {session && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-[#7252B8] rounded-lg font-mono text-white">
          <div className="font-semibold text-gray-300 mb-1">Session</div>
          <div className="whitespace-pre">
            {JSON.stringify(session, null, 2)}
          </div>
        </div>
      )}
      {signInFailure && !signingIn && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-[#7252B8] rounded-lg font-mono text-white">
          <div className="font-semibold text-gray-300 mb-1">SIWF Result</div>
          <div className="whitespace-pre">{signInFailure}</div>
        </div>
      )}
      {signInResult && !signingIn && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-[#7252B8] rounded-lg font-mono text-white">
          <div className="font-semibold text-gray-300 mb-1">SIWF Result</div>
          <div className="whitespace-pre">
            {JSON.stringify(signInResult, null, 2)}
          </div>
        </div>
      )}
    </>
  );
}

const renderError = (error: Error | null) => {
  if (!error) return null;
  if (error instanceof BaseError) {
    const isUserRejection = error.walk(
      (e) => e instanceof UserRejectedRequestError
    );

    if (isUserRejection) {
      return <div className="text-red-300 text-xs mt-1">Rejected by user.</div>;
    }
  }

  return <div className="text-red-300 text-xs mt-1">{error.message}</div>;
};
