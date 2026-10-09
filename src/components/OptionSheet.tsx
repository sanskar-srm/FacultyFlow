import { ScrollView } from 'react-native';
import { BottomSheet } from '@/src/components/BottomSheet';
import { ListGroup, RadioRow } from '@/src/components/ListGroup';
import type { Option } from '@/src/constants/appConstants';

interface Props<T> {
  visible: boolean;
  title: string;
  options: Option<T>[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

/** Single choice from a short list in a bottom sheet. Choosing closes it. */
export function OptionSheet<T>({ visible, title, options, value, onSelect, onClose }: Props<T>) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView>
        <ListGroup>
          {options.map((o) => (
            <RadioRow
              key={o.label}
              icon={o.icon}
              label={o.label}
              detail={o.detail}
              selected={o.value === value}
              onPress={() => {
                onSelect(o.value);
                onClose();
              }}
            />
          ))}
        </ListGroup>
      </ScrollView>
    </BottomSheet>
  );
}
