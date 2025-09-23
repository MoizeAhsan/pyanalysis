// Temporary placeholder - will be migrated from existing component
import { FC } from 'react';

interface ProjectInputProps {
  onAnalysisStart: () => void;
  onAnalysisComplete: (message?: string) => void;
  onAnalysisError: (error: string) => void;
  onReset: () => void;
  loading: boolean;
}

const ProjectInput: FC<ProjectInputProps> = (_props) => {
  // This is a placeholder - the actual component will be migrated
  // from the existing ProjectInput.js in the next tasks
  return <div>ProjectInput Component - To be migrated</div>;
};

export default ProjectInput;