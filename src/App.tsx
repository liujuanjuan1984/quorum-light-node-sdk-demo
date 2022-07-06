import { BrowserRouter as Router, Route } from 'react-router-dom';
import QuorumLightNodeSDK from 'quorum-light-node-sdk';

import Index from './pages/Index';

import SnackBar from 'components/SnackBar';
import ConfirmDialog from './components/ConfirmDialog';

import { StoreProvider } from './store';

import { SEED_URLS, NODE_TOKEN } from './constant';

for (const seedUrl of SEED_URLS) {
  QuorumLightNodeSDK.cache.Group.add(seedUrl, {
    nodeToken: NODE_TOKEN
  });
}

const AppRouter = () => {
  return (
    <StoreProvider>
      <Router>
        <div>
          <Route path="/" component={Index} />
          <SnackBar />
          <ConfirmDialog />
        </div>
      </Router>
    </StoreProvider>
  );
};

export default AppRouter;
