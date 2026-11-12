import { Stack, Typography } from '@mui/material';
import { useAnalysisStatus } from '@shared/api/queries';
import { AnalysisSummary } from './AnalysisSummary';
import { ProjectInput } from './ProjectInput';

export default function HomePage() {
  const status = useAnalysisStatus();
  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h4" component="h2" gutterBottom>
          Visual Python Project Explorer
        </Typography>
        <Typography color="text.secondary">
          Analyze a Python project to explore its structure, dependencies, and code quality.
        </Typography>
      </div>
      <ProjectInput />
      {status.data?.has_result && status.data.state !== 'running' && <AnalysisSummary />}
    </Stack>
  );
}
