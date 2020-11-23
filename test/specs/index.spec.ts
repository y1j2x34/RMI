import { ParameterType, rclass, rmethod, RMI } from '../../src';
import LocalCommunicator from '../fixtures/communicator/LocalCommunicator';

describe('Remote method invocation', () => {
    let localCommunicator: LocalCommunicator;
    let remoteCommunicator: LocalCommunicator;
    let localRMI: RMI;
    let remoteRMI: RMI;
    beforeEach(() => {
        localCommunicator = new LocalCommunicator();
        remoteCommunicator = localCommunicator.createRemote();
        localRMI = new RMI('local', localCommunicator);
        remoteRMI = new RMI('local', remoteCommunicator);
    });
    afterEach(() => {
        localRMI.destroy();
        remoteRMI.destroy();
    });
    it('Should be called correctly in the RMI object with the same method name and the same RMI id', async () => {
        const method = sinon.spy();
        remoteRMI.lmethod('method', method);

        await localRMI.rmethod('method')();

        expect(method).to.be.calledOnce;

        const method2 = sinon.spy();

        remoteRMI.lmethod('method2', method2);

        await localRMI.rmethod('method2')(1);

        expect(method2).to.be.calledWith(1);

        const method3 = sinon.spy(sinon.fake.returns('hello'));

        remoteRMI.lmethod('method3', method3);

        const ret = await localRMI.rmethod('method3')();

        expect(ret).to.be.eq('hello');

        const fakeMethod4 = sinon.fake.throws('error-message');
        const method4 = sinon.spy(fakeMethod4);

        remoteRMI.lmethod('method4', method4);
        const promise = localRMI.rmethod('method4')();
        await promise.catch((reason: Error) => {
            const remoteError = fakeMethod4.exceptions[0] as Error;
            expect(method4).to.been.thrown(remoteError);
            expect(reason.message).to.be.equal(remoteError.message);
            expect(reason.stack).to.be.equal(remoteError.stack);
        });
    });
    it('Should create remote instance correctly', async () => {
        interface Animal {
            getType(): string;
        }
        class DogImpl implements Animal {
            constructor(private type: string) {}
            public getType() {
                return this.type;
            }
        }
        remoteRMI.lclass('Animal', DogImpl);
        @rclass({
            id: 'Animal'
        })
        class DogDef implements Animal {
            getType(): string {
                throw new Error('Method not implemented.');
            }
        }
        const RemoteDogClass = localRMI.rclass(DogDef);

        const remoteDog = new RemoteDogClass('dog');

        await expect(remoteDog.getType()).to.be.eventually.become('dog');

        await expect(localRMI.release(remoteDog)).to.be.eventually.become(true);
    });

    it('Should handle callbacks correctly', async () => {
        interface MediaProcessor {
            downloadAndParse(url: string, receive: (data: ArrayBuffer, offset: number, total: number) => void);
        }
        class MediaProcessorImpl implements MediaProcessor {
            downloadAndParse(url: string, receive: (data: ArrayBuffer, offset: number, total: number) => void) {
                for (let i = 0; i < 5; i++) {
                    receive(new ArrayBuffer(10), i, 5);
                }
            }
        }
        remoteRMI.lclass('media-processor', MediaProcessorImpl);
        @rclass({
            id: 'media-processor'
        })
        class MediaProcessorDef implements MediaProcessor {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            downloadAndParse(url: string, receive: (data: ArrayBuffer, offset: number, total: number) => void) {
                throw new Error('Method not implemented.');
            }
        }
        const RemoteMediaProcessorImpl = localRMI.rclass(MediaProcessorDef);

        const processor = new RemoteMediaProcessorImpl();

        const callback = sinon.spy();

        await processor.downloadAndParse('http://url', callback);

        expect(callback).to.be.called;
        expect(callback).to.be.callCount(5);
    });

    it('Should paramTypes of @rmethod() option work correctly', async () => {
        function method(data: string, callback: (data: string) => void) {
            callback(data);
        }
        rmethod({
            paramTypes: [ParameterType.serializable, ParameterType.callback]
        })(
            {
                m: method
            },
            'm'
        );
        const receiver = sinon.spy();
        remoteCommunicator.addReceiveMessageListener(receiver);
        remoteRMI.lmethod('method', method);
        const callback = sinon.spy();
        await localRMI.rmethod('method', method)('data', callback);

        expect(callback).to.be.calledOnce;
        expect(typeof receiver.args[0][0]).not.to.be.eql('function');
        expect(callback.args[0][0]).to.be.eql('data');
    });

    it('Should raise an error when register multiple local classes with same id', () => {
        remoteRMI.lclass('computer', class Computer {});
        const callback = sinon.spy(() => {
            remoteRMI.lclass('computer', class Computer {});
        });
        expect(callback).to.throw();
    });
    it('Should raise an error when release an illegal remote instance', async () => {
        await expect(localRMI.release({})).to.be.eventually.rejected;
    });
    it('Should handle the asynchrounous methods correctly', async () => {
        interface FileStorage {
            read(): Promise<ArrayBuffer>;
        }
        // ========================== remote ==========================
        const mockFileData = new ArrayBuffer(10);
        class FileStorageImpl implements FileStorage {
            read(): Promise<ArrayBuffer> {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(mockFileData);
                    }, 100);
                });
            }
        }
        remoteRMI.lclass('FileStorage', FileStorageImpl);
        // ========================== remote end ==========================

        // ========================== local ==========================
        @rclass({
            id: 'FileStorage'
        })
        class FileStorageDef implements FileStorage {
            read(): Promise<ArrayBuffer> {
                throw new Error('Method not implemented.');
            }
        }

        const RemoteFileStorage = localRMI.rclass(FileStorageDef);

        const storage = new RemoteFileStorage();

        const promise = storage.read();
        // ========================== local end ==========================

        await expect(promise).to.be.eventually.become(mockFileData);
    });

    it('Should work correctly to pass remote objects', async () => {
        class A {}
        class B {
            method(a: A) {
                console.info(a);
                return a instanceof A;
            }
        }
        remoteRMI.lclass('A', A);
        remoteRMI.lclass('B', B);

        @rclass({
            id: 'A'
        })
        class ADef {}
        @rclass({
            id: 'B'
        })
        class BDef {
            @rmethod({
                paramTypes: [ParameterType.remoteObject]
            })
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            method(_: A): boolean {
                throw new Error('Method not implemented');
            }
        }
        const RemoteA = localRMI.rclass(ADef);
        const RemoteB = localRMI.rclass(BDef);

        const remoteA = new RemoteA();
        const remoteB = new RemoteB();

        await expect(remoteB.method(remoteA)).to.become(true);
    });
});
