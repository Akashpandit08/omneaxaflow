"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Check, Zap, Sparkles, ExternalLink, Calendar, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import type { Subscription, Plan, BillingHistory as IBillingHistory } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import Head from "next/head";

declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function BillingPage() {
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [orderVerified, setOrderVerified] = useState(false);
  const searchParams = useSearchParams();

  const { data: subscription, refetch: refetchSub } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<Subscription>("/subscriptions/me").then((r) => r.data),
  });

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get<Plan[]>("/subscriptions/plans").then((r) => r.data),
  });

  const { data: history } = useQuery({
    queryKey: ["billing-history"],
    queryFn: () => api.get<IBillingHistory[]>("/subscriptions/history").then((r) => r.data),
  });

  // Handle Cashfree return_url redirect callback
  useEffect(() => {
    const returnOrderId = searchParams.get("order_id");
    if (returnOrderId && !orderVerified) {
      setOrderVerified(true);
      verifyPayment(returnOrderId);
    }
  }, [searchParams]);

  const verifyPayment = async (orderId: string) => {
    try {
      await api.post(`/subscriptions/verify-order?order_id=${orderId}`);
      toast.success("Payment verified! Your plan has been upgraded.");
      refetchSub();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail && detail.includes("ACTIVE")) {
        toast.success("Subscription already active.");
        refetchSub();
      } else {
        toast.error(detail || "Payment verification failed. Please contact support.");
      }
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (plan.price_cents === 0) return;
    setIsProcessing(plan.id);
    try {
      // 1. Create a Cashfree order via backend
      const { data: checkoutData } = await api.post("/subscriptions/checkout", { plan_id: plan.id });

      // 2. Initialize Cashfree SDK and open checkout
      const cashfree = await window.Cashfree({
        mode: checkoutData.cf_env === "production" ? "production" : "sandbox",
      });

      const checkoutOptions = {
        paymentSessionId: checkoutData.payment_session_id,
        returnUrl: `${window.location.origin}/billing?order_id=${checkoutData.order_id}`,
      };

      cashfree.checkout(checkoutOptions);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to initiate Cashfree checkout");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <>
      {/* Load Cashfree SDK v3 */}
      <script src="https://sdk.cashfree.com/js/v3/cashfree.js" />

      <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-brand-400" /> Billing &amp; Plans
            </h1>
            <p className="text-sm text-slate-400">Manage your subscription and view billing history.</p>
          </div>
          
          {subscription && (
            <Card className="flex-1 min-w-[300px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Current Plan</span>
                <Badge variant={subscription.plan.tier === "free" ? "slate" : "brand"}>
                  {subscription.plan.name}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-white mb-4">
                {subscription.plan.price_cents === 0 ? "Free" : `₹${subscription.plan.price_cents / 100} / mo`}
              </p>
              
              <div className="text-sm text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Videos generated</span>
                  <span className="text-white font-medium">{subscription.videos_used_this_period} / {subscription.plan.monthly_video_limit}</span>
                </div>
                {subscription.current_period_end && (
                  <div className="flex justify-between text-xs mt-2 pt-2 border-t border-surface-border">
                    <span>Renews on</span>
                    <span className="text-white">{new Date(subscription.current_period_end).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Pricing Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Upgrade your plan</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans?.map((plan) => {
              const isCurrentPlan = subscription?.plan.id === plan.id;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`flex flex-col ${plan.tier === "pro" ? "border-brand-500 shadow-[0_0_15px_rgba(var(--brand-500-rgb),0.2)]" : ""}`}
                >
                  {plan.tier === "pro" && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-3xl font-bold text-white mt-2">
                      {plan.price_cents === 0 ? "Free" : `₹${plan.price_cents / 100}`}
                      <span className="text-sm text-slate-500 font-normal">/mo</span>
                    </p>
                  </div>
                  
                  <ul className="space-y-3 mb-8 flex-1">
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                      {plan.monthly_video_limit} videos per month
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                      Up to {plan.max_video_duration_seconds / 60} mins per video
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                      {plan.storage_gb}GB cloud storage
                    </li>
                    {plan.tier !== "free" && (
                      <li className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        Premium ElevenLabs voices
                      </li>
                    )}
                    {plan.tier === "business" && (
                      <li className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        Priority rendering queue
                      </li>
                    )}
                  </ul>
                  
                  <Button 
                    variant={isCurrentPlan ? "secondary" : plan.tier === "pro" ? "primary" : "outline"} 
                    className="w-full"
                    disabled={isCurrentPlan || isProcessing === plan.id || plan.price_cents === 0}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {isCurrentPlan ? (
                      <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Current Plan</span>
                    ) : plan.price_cents === 0 ? "Free" : (
                      isProcessing === plan.id ? "Processing..." : "Upgrade"
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Billing History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Billing History</h2>
          <Card className="p-0 overflow-hidden">
            {!history?.length ? (
              <div className="p-8 text-center text-slate-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No billing history available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-surface-elevated border-b border-surface-border">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Payment ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} className="border-b border-surface-border last:border-0 hover:bg-surface-elevated/50 transition-colors">
                        <td className="px-6 py-4 text-white">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-white">
                          ₹{item.amount_cents / 100}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={item.status === "paid" ? "green" : item.status === "failed" ? "red" : "slate"}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {item.cashfree_payment_id ? (
                            <span className="text-slate-400 text-xs font-mono">{item.cashfree_payment_id}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
