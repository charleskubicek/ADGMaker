# ADGMaker

import argparse
import binascii
import gzip
import os
import platform
import shutil
from pathlib import Path

import pkg_resources
from jinja2 import Environment, FileSystemLoader


class ADGMaker(object):

    def __init__(self, debug=False, file_type="wav"):
        self.file_type = file_type
        self.debug = debug

        # Ex: {'cello_05_forte_arco-normal': [ xml, xml, .. ]
        self.adgs = {}
        self.default_note = 104

        self.jenv = Environment(loader=FileSystemLoader(os.path.dirname(os.path.realpath(__file__))),
                                trim_blocks=True)

    def empty_adgs(self):
        self.adgs = {}

    def all_adgs(self):
        return self.adgs

    def add_sample_file_to_instrument(self, file_path, adg_name, note_value):

        instrument_xml = self.create_instrument_xml(file_path, note_value)

        if adg_name in self.adgs:
            adg_contents = self.adgs[adg_name]
        else:
            adg_contents = []

        adg_contents.append(instrument_xml)
        self.adgs[adg_name] = adg_contents

        return

    def create_base_xml(self, adg_name):
        """
        Create the standard cruft XML for the ADG.
        """

        items = self.adgs[adg_name]
        xml = self.jenv.get_template('base_xml.tpl').render(
            items=items,
        )

        return xml

    def create_instrument_xml(self, file_path, note_value):

        dot_file_type = '.' + self.file_type

        file_name_no_extension = file_path.split(dot_file_type)[0].split(os.sep)[-1]

        name = file_name_no_extension
        file_name = name + dot_file_type
        # note_value = self.string_to_midi_note(note)
        ableton_path = "userfolder:" + file_path.rsplit(os.sep, 1)[0] + os.sep + '#' + file_name

        path_hint_els = self.crate_path_hint(file_path)

        data = binascii.hexlify(file_path.encode('utf-16')).decode('utf-8').upper()

        xml = self.jenv.get_template('instrument_xml.tpl').render(
            path_hint_els=path_hint_els,
            name=name,
            mp3_name=file_name,
            note_value=note_value,
            ableton_path=ableton_path,
            data=data
        )

        return xml

    def crate_path_hint(self, file_path):
        hint_els = []
        for part in file_path.rsplit(os.sep)[1:-1]:
            hint_els.append('<RelativePathElement Dir="%s" />' % part)

        return '\n'.join(hint_els)

    def create_adg(self, adg_name, xml):
        """
        Create the final ADG file.
        """

        xml_name = adg_name + '.xml'
        adg_file = adg_name + '.adg'

        f = open(xml_name, 'w')
        f.write(xml)
        f.close()

        with open(xml_name, 'rb') as f_in:
            with gzip.open(adg_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

        if not self.debug:
            os.remove(xml_name)

        print("Created " + adg_file + "!")

        return adg_file

    ##
    # Utility
    ##

    def string_to_midi_note(self, midstr):
        """ 
            In Ableton, C3 = 60 supposedly,

            but,

            ZoneSetting:ReceivingNote:80 == C2
            ZoneSetting:ReceivingNote:79 == C#2


        """

        # I am a bad person.
        notes_ref = {

            'C0': 104,
            'Cs0': 103,
            'D0': 102,
            'Ds0': 101,
            'E0': 100,
            'F0': 99,
            'Fs0': 98,
            'G0': 97,
            'Gs0': 96,
            'A0': 95,
            'As0': 94,
            'B0': 93,

            'C1': 92,
            'Cs1': 91,
            'D1': 90,
            'Ds1': 89,
            'E1': 88,
            'F1': 87,
            'Fs1': 86,
            'G1': 85,
            'Gs1': 84,
            'A1': 83,
            'As1': 82,
            'B1': 81,

            'C2': 80,
            'Cs2': 79,
            'D2': 78,
            'Ds2': 77,
            'E2': 76,
            'F2': 75,
            'Fs2': 74,
            'G2': 73,
            'Gs2': 72,
            'A2': 71,
            'As2': 70,
            'B2': 69,

            'C3': 68,
            'Cs3': 67,
            'D3': 66,
            'Ds3': 65,
            'E3': 64,
            'F3': 63,
            'Fs3': 62,
            'G3': 61,
            'Gs3': 60,
            'A3': 59,
            'As3': 58,
            'B3': 57,

            'C4': 56,
            'Cs4': 55,
            'D4': 54,
            'Ds4': 53,
            'E4': 52,
            'F4': 51,
            'Fs4': 50,
            'G4': 49,
            'Gs4': 48,
            'A4': 47,
            'As4': 46,
            'B4': 45,

            'C5': 44,
            'Cs5': 43,
            'D5': 42,
            'Ds5': 41,
            'E5': 40,
            'F5': 39,
            'Fs5': 38,
            'G5': 37,
            'Gs5': 36,
            'A5': 35,
            'As5': 34,
            'B5': 33,

            'C6': 32,
            'Cs6': 31,
            'D6': 30,
            'Ds6': 29,
            'E6': 28,
            'F6': 27,
            'Fs6': 26,
            'G6': 25,
            'Gs6': 24,
            'A6': 23,
            'As6': 22,
            'B6': 21,

            'C7': 20,
            'Cs7': 19,
            'D7': 18,
            'Ds7': 17,
            'E7': 16,
            'F7': 15,
            'Fs7': 14,
            'G7': 13,
            'Gs7': 12,
            'A7': 11,
            'As7': 10,
            'B7': 9,

            'C8': 8,
            'Cs8': 7,
            'D8': 6,
            'Ds8': 5,
            'E8': 4,
            'F8': 3,
            'Fs8': 2,
            'G8': 1,
            'Gs8': 0,
            'A8': -1,
            'As8': -2,
            'B8': -3,

        }

        note = notes_ref.get(midstr, None)
        if note:
            return note
        else:
            note = self.default_note
            self.default_note = self.default_note - 1

            if self.default_note == 0:
                self.default_note = 104

            return note


class SamplePackAdgMaker:

    def __init__(self, file_type="wav"):
        self.file_type = file_type
        self.adg_maker = ADGMaker(file_type=file_type)

    def handle(self, argv=None):
        """
        Main function.

        Parses command, load settings and dispatches accordingly.

        """
        help_message = "Please supply a path to a folder of samples. See --help for more options."
        parser = argparse.ArgumentParser(description='ADGMaker - Create Ableton Live Instruments.\n')
        parser.add_argument('samples_path', metavar='U', type=str, nargs='*', help=help_message)

        parser.add_argument('-l', '--loops', action='store_true', help='Include suspected loop dirs (excluded by '
                                                                       'default)', default=False)
        parser.add_argument('-n', '--name', type=str, help='Name', default=False)
        parser.add_argument('-d', '--debug', action='store_true', help='Debug (no delete XML)', default=False)
        parser.add_argument('-v', '--version', action='store_true', default=False,
                            help='Display the current version of ADGMaker')

        args = parser.parse_args(argv)
        self.vargs = vars(args)

        print(self.vargs)

        if self.vargs['version']:
            version = pkg_resources.require("adgmaker")[0].version
            print(version)
            return

        # Samples are an important requirement.
        if not self.vargs['samples_path']:
            print(help_message)
            return

        if self.vargs['samples_path']:
            self.create_adg_from_samples_path(self.vargs['samples_path'][0], self.vargs['name'], self.vargs['loops'])

        print("Done! Remember to update your User Library in Live to see these new instruments!")

    def get_subdirs_containing_valid_samples(self, path, include_loops=False):
        return [p for p in Path(path).iterdir() if p.is_dir() and (include_loops is True or (include_loops is False and 'loop' not in p.name.lower())) ]

    def create_adg_from_samples_path(self, samples_path, given_name=None, include_loops=False):
        """
        Create an ADG from the samples path.

        """
        file_type_wildcard = f'*.{self.file_type}'

        if given_name is None:
            given_name = Path(samples_path).parts[-1]

        subdirs = self.get_subdirs_containing_valid_samples(samples_path, include_loops)

        for subdir in subdirs:

            adg_name = f'{given_name} - {subdir.name}'

            samples_list = list(Path(subdir).rglob(file_type_wildcard))[0:104]

            for i, wav in enumerate(samples_list):
                file_path = os.path.abspath(wav)

                note_value = 104 - i
                self.adg_maker.add_sample_file_to_instrument(file_path, adg_name, note_value)

        for adg_name in self.adg_maker.all_adgs():  # self.adgs.keys():
            final_xml = self.adg_maker.create_base_xml(adg_name)
            adg_file = self.adg_maker.create_adg(adg_name, final_xml)

        return adg_file


if __name__ == '__main__':  # pragma: no cover
    SamplePackAdgMaker().handle()
