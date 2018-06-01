// release
import ReleaseWrapper from './release/ReleaseWrapper';
import ReleaseDeployer from './release/ReleaseDeployer';

// kernel
import KernelWrapper from './kernel/KernelWrapper';
import KernelDeployer from './kernel/KernelDeployer';
import KernelProvider from './kernel/KernelProvider';

// module information
const version = 'v' + require('../package.json').version;

export {
  version,
  ReleaseWrapper,
  ReleaseDeployer,
  KernelWrapper,
  KernelDeployer,
  KernelProvider,
};
