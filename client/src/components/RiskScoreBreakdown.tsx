import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface RiskScoreBreakdownProps {
  patientId?: number;
}

export default function RiskScoreBreakdown({ patientId }: RiskScoreBreakdownProps) {
  const { data: riskData } = useQuery({
    queryKey: [`/api/patients/${patientId}/risk-assessment`],
    enabled: !!patientId,
  });

  if (!patientId || !riskData) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-900">위험 점수 상세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-neutral-500">
            환자를 선택하여 위험 점수를 확인하세요
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-danger";
    if (score >= 40) return "bg-warning";
    return "bg-success";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 70) return "text-danger";
    if (score >= 40) return "text-warning";
    return "text-success";
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-neutral-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-neutral-900">위험 점수 상세</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-600">거래 빈도</span>
              <span className={`text-sm font-medium ${getScoreTextColor(riskData.factors.frequency)}`}>
                {riskData.factors.frequency}/100
              </span>
            </div>
            <Progress value={riskData.factors.frequency} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-600">거래 금액</span>
              <span className={`text-sm font-medium ${getScoreTextColor(riskData.factors.amount)}`}>
                {riskData.factors.amount}/100
              </span>
            </div>
            <Progress value={riskData.factors.amount} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-600">시간 패턴</span>
              <span className={`text-sm font-medium ${getScoreTextColor(riskData.factors.timing)}`}>
                {riskData.factors.timing}/100
              </span>
            </div>
            <Progress value={riskData.factors.timing} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-600">위치 이상</span>
              <span className={`text-sm font-medium ${getScoreTextColor(riskData.factors.location)}`}>
                {riskData.factors.location}/100
              </span>
            </div>
            <Progress value={riskData.factors.location} className="h-2" />
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-neutral-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-neutral-900">종합 위험 점수</span>
            <span className={`text-lg font-bold ${getScoreTextColor(riskData.totalScore)}`}>
              {riskData.totalScore}/100
            </span>
          </div>
          
          {riskData.recommendations && riskData.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-neutral-900 mb-2">권장사항</h4>
              <ul className="text-sm text-neutral-600 space-y-1">
                {riskData.recommendations.slice(0, 3).map((rec: string, index: number) => (
                  <li key={index} className="list-disc list-inside">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
