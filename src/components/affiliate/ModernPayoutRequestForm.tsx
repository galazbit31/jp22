import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAffiliate } from '@/hooks/useAffiliate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { DollarSign, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const payoutSchema = z.object({
  amount: z.string()
    .min(1, 'Jumlah wajib diisi')
    .refine(val => !isNaN(Number(val)), {
      message: 'Jumlah harus berupa angka',
    })
    .refine(val => Number(val) > 0, {
      message: 'Jumlah harus lebih dari 0',
    }),
  method: z.string().min(1, 'Metode pembayaran wajib dipilih'),
  bankName: z.string().min(1, 'Nama bank wajib diisi'),
  accountNumber: z.string().min(1, 'Nomor rekening wajib diisi'),
  accountName: z.string().min(1, 'Nama pemilik rekening wajib diisi'),
});

type PayoutFormValues = z.infer<typeof payoutSchema>;

const ModernPayoutRequestForm = () => {
  const { affiliate, settings, requestPayout, commissions } = useAffiliate();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Calculate available commission (approved commissions only)
  const approvedCommissions = commissions.filter(comm => comm.status === 'approved');
  const availableCommission = approvedCommissions.reduce((sum, comm) => sum + comm.commissionAmount, 0);
  
  // Calculate true pending commission (excluding approved commissions)
  // Ensure it's never negative by using Math.max
  const truePendingCommission = affiliate ? 
    Math.max(0, affiliate.pendingCommission - availableCommission) : 0;

  const form = useForm<PayoutFormValues>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      amount: '',
      method: '',
      bankName: affiliate?.bankInfo?.bankName || '',
      accountNumber: affiliate?.bankInfo?.accountNumber || '',
      accountName: affiliate?.bankInfo?.accountName || '',
    },
  });

  const onSubmit = async (data: PayoutFormValues) => {
    if (!affiliate) {
      toast({
        title: 'Error',
        description: 'Anda belum terdaftar sebagai affiliate',
        variant: 'destructive',
      });
      return;
    }

    const amount = Number(data.amount);
    
    // Check if amount is greater than pending commission
    if (amount > availableCommission) {
      toast({
        title: 'Error',
        description: 'Jumlah melebihi komisi yang tersedia untuk pencairan',
        variant: 'destructive',
      });
      return;
    }

    // Check if amount is greater than minimum payout
    if (settings && amount < settings.minPayoutAmount) {
      toast({
        title: 'Error',
        description: `Jumlah minimum pencairan adalah ¥${settings.minPayoutAmount.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const bankInfo = {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
      };
      
      await requestPayout(amount, data.method, bankInfo);
      
      toast({
        title: 'Berhasil',
        description: 'Permintaan pencairan berhasil diajukan',
      });
      
      form.reset({
        amount: '',
        method: data.method,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
      });
      
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengajukan pencairan',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!affiliate || !settings) {
    return null;
  }

  const minAmount = settings.minPayoutAmount;
  const maxAmount = availableCommission;
  const canRequestPayout = maxAmount >= minAmount;
  const approvedCommissionsCount = commissions.filter(comm => comm.status === 'approved').length;
  
  // Calculate progress percentage
  const progressPercentage = Math.min(100, (maxAmount / minAmount) * 100);

  return (
    <Card className="border-primary/10 hover:shadow-md transition-all duration-300 h-full">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
        <CardTitle className="flex items-center text-xl">
          <DollarSign className="w-5 h-5 mr-2 text-primary" />
          {t('affiliate.requestPayout')}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {!canRequestPayout ? (
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-amber-100 p-1.5 rounded-full text-amber-600 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-amber-800 text-sm">{t('affiliate.notEligibleForPayout')}</h4>
                <p className="text-sm text-amber-700 mt-1">
                  {t('affiliate.pendingCommissionMessage', { 
                    available: maxAmount.toLocaleString(), 
                    minimum: minAmount.toLocaleString() 
                  })}
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  Note: Hanya komisi dengan status "Approved" yang tersedia untuk pencairan. Komisi "Pending" harus disetujui admin terlebih dahulu. Saldo tersedia akan berkurang setelah pengajuan pencairan.
                </p>
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progress to minimum payout</span>
                <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>¥0</span>
                <span>¥{minAmount.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
              <h5 className="font-medium text-gray-700 text-sm mb-2">Payout Information</h5>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex justify-between">
                  <span>Approved Commissions:</span>
                  <span className="font-medium">{approvedCommissionsCount} commissions</span>
                </li>
                <li className="flex justify-between">
                  <span>Available Commission:</span>
                  <span className="font-medium">¥{maxAmount.toLocaleString()}</span>
                </li>
                <li className="flex justify-between">
                  <span>Minimum Payout:</span>
                  <span className="font-medium">¥{minAmount.toLocaleString()}</span>
                </li>
                <li className="flex justify-between">
                  <span>Still Needed:</span>
                  <span className="font-medium text-amber-600">¥{Math.max(0, minAmount - maxAmount).toLocaleString()}</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            {!isFormOpen ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-1.5 rounded-full text-green-600 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800 text-sm">You're eligible for payout!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      You have ¥{maxAmount.toLocaleString()} available for withdrawal from {approvedCommissionsCount} approved commissions.
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      This amount represents your approved commissions that are ready for payout. After requesting a payout, this balance will immediately decrease by the requested amount.
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-700 text-sm mb-2">Payout Information</h5>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex justify-between">
                      <span>Available Commission:</span>
                      <span className="font-medium">¥{maxAmount.toLocaleString()}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Pending Commissions:</span>
                      <span className="font-medium">¥{truePendingCommission.toLocaleString()}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Minimum Payout:</span>
                      <span className="font-medium">¥{minAmount.toLocaleString()}</span>
                    </li>
                  </ul>
                </div>
                
                <Button 
                  onClick={() => setIsFormOpen(true)}
                  className="w-full"
                >
                  Request Payout Now
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('affiliate.payoutAmount')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={minAmount}
                            max={maxAmount}
                            placeholder={`Min: ¥${minAmount.toLocaleString()}`}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          {t('affiliate.available')} ¥{maxAmount.toLocaleString()} (approved) | {t('affiliate.minimum')} ¥{minAmount.toLocaleString()}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('affiliate.paymentMethod')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih metode pembayaran" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {settings.payoutMethods.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div className="flex items-center">
                      <CreditCard className="w-5 h-5 text-gray-500 mr-2" /> 
                      <h4 className="font-medium text-gray-700">{t('affiliate.bankInfo')}</h4>
                    </div>

                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('affiliate.bankName')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Contoh: BCA, Mandiri, BNI" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('affiliate.accountNumber')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nomor rekening" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('affiliate.accountHolderName')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nama pemilik rekening" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Processing...' : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModernPayoutRequestForm;