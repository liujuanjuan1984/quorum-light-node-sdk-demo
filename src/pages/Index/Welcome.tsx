import { observer, useLocalObservable } from 'mobx-react-lite';
import sleep from 'utils/sleep';
import Button from 'components/Button';
import { ethers } from 'ethers';

interface IProps {
  start: () => void;
}

export default observer((props: IProps) => {
  const state = useLocalObservable(() => ({
    loading: false
  }));
  
  const start = async () => {
    if (state.loading) {
      return;
    }
    state.loading = true;
    await sleep(10);
    const wallet = ethers.Wallet.createRandom();
    const password = "123";
    const keystore = await wallet.encrypt(password, {
      scrypt: {
        N: 64
      }
    });
    localStorage.setItem('keystore', keystore.replaceAll('\\', ''));
    localStorage.setItem('password', password);
    localStorage.setItem('privateKey', wallet.privateKey);
    await sleep(2000);
    props.start();
  }

  return (
    <div className="p-40">
      <div className="text-[60px] text-blue-400 font-bold text-center">
         Quorum 轻节点演示 <br /><span className="text-[40px]">（JavaScript 版本）</span>
      </div>
      <div className="mt-10 flex justify-center">
        <Button onClick={start} className="mr-4">
          {state.loading ? '正在创建账户...' : '快速开始'}
        </Button>
      </div>
    </div>
  )
});
