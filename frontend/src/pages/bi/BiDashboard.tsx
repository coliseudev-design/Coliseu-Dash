import { Outlet } from 'react-router-dom';
import { usePeriodStore, periodToParams } from '../../store/periodStore';
import { BiPeriodFilter } from '../../types/bi.types';
import { useBranchParam } from '../../contexts/BranchContext';

export default function BiDashboard() {
  const periodState = usePeriodStore();
  const branchParam = useBranchParam();

  const filter: BiPeriodFilter = {
    ...periodToParams(periodState),
    ...branchParam,
  };

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <Outlet context={{ filter }} />
    </div>
  );
}
