import _ from 'lodash';
import React from 'react';
import api from '../services/api';
import Base from '../components/base';
import ContainersPanel from '../components/containersPanel';
import PodCpuChart from '../components/podCpuChart';
import ReplicasChart from '../components/replicasChart';
import PodRamChart from '../components/podRamChart';
import DeleteButton from '../components/deleteButton';
import EventsPanel from '../components/eventsPanel';
import ItemHeader from '../components/itemHeader';
import Loading from '../components/loading';
import MetadataFields from '../components/metadataFields';
import Field from '../components/field';
import PodsPanel from '../components/podsPanel';
import SaveButton from '../components/saveButton';
import ScaleButton from '../components/scaleButton';
import {defaultSortInfo} from '../components/sorter';
import getMetrics from '../utils/metricsHelpers';
import {filterByOwner} from '../utils/filterHelper';
import ChartsContainer from '../components/chartsContainer';

const service = api.replicaSet;

export default class ReplicaSet extends Base {
    state = {
        podsSort: defaultSortInfo(x => this.setState({podsSort: x})),
        eventsSort: defaultSortInfo(x => this.setState({eventsSort: x})),
    };

    componentDidMount() {
        const {namespace, name} = this.props;

        this.registerApi({
            item: service.get(namespace, name, item => this.setState({item})),
            pods: api.pod.list(namespace, pods => this.setState({pods})),
            events: api.event.list(namespace, events => this.setState({events})),
            metrics: api.metrics.pods(namespace, metrics => this.setState({metrics})),
        });
    }

    render() {
        const {namespace, name} = this.props;
        const {item, pods, metrics, events, podsSort, eventsSort} = this.state;

        const filteredPods = filterByOwner(pods, item);
        const filteredEvents = filterByOwner(events, item);
        const filteredMetrics = getMetrics(filteredPods, metrics);

        return (
            <div id='content'>
                <ItemHeader title={['Replica Set', namespace, name]} ready={!!item}>
                    <>
                        <ScaleButton
                            namespace={namespace}
                            name={name}
                            scaleApi={service.scale}
                        />

                        {/* <SaveButton
                            item={item}
                            onSave={x => service.put(x)}
                        />

                        <DeleteButton
                            onDelete={() => service.delete(namespace, name)}
                        /> */}
                    </>
                </ItemHeader>

                <ChartsContainer>
                    <ReplicasChart item={item} />
                    <PodCpuChart items={filteredPods} metrics={filteredMetrics} />
                    <PodRamChart items={filteredPods} metrics={filteredMetrics} />
                </ChartsContainer>

                <div className='contentPanel'>
                    {!item ? <Loading /> : (
                        <div>
                            <MetadataFields item={item} />

                            <Field name='Owned By'>
                                {_.map(item.metadata.ownerReferences, x => (
                                    <div key={x.uid}>
                                        <a href={`#!${x.kind !== 'ReplicaSet' ? 'workload/' : ''}${x.kind.toLowerCase()}/${namespace}/${x.name}`}>
                                            {`${x.kind.toLowerCase()}/${namespace}/${x.name}`}
                                        </a>
                                    </div>
                                ))}
                            </Field>
                        </div>
                    )}
                </div>

                <ContainersPanel spec={item && item.spec.template.spec} />

                <div className='contentPanel_header'>Pods</div>
                <PodsPanel
                    items={filteredPods}
                    sort={podsSort}
                    metrics={filteredMetrics}
                    skipNamespace={true}
                />

                <div className='contentPanel_header'>Events</div>
                <EventsPanel
                    shortList={true}
                    sort={eventsSort}
                    items={filteredEvents}
                />
            </div>
        );
    }
}
